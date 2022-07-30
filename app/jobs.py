from django_cron import CronJobBase, Schedule
from django.utils import timezone
from .models import Semester

import logging
import json
from nuregi import api
from nuregi.scraper.pdf import get_schedule


class GetCourseList(CronJobBase):
    update_period = 360  # in minutes
    schedule = Schedule(run_every_mins=update_period)
    code = 'app.get_course_list'

    def do(self):
        start_time = timezone.now()
        logging.info(f'Cron started: app.get_course_list. Timestamp: {start_time}\n')

        cur_semester = api.get_semester()[-1]
        db_semester = Semester.objects.last()
        db_semester_code = getattr(db_semester, 'semester_code', None)
        if db_semester_code and int(db_semester_code) > int(cur_semester['ID']):    # temp fix, todo resolve
            cur_semester['ID'] = db_semester_code
            cur_semester['NAME'] = getattr(db_semester, 'semester_name')

        if cur_semester is None:
            logging.error('Aborted: cur_semester is None')
            return

        logging.info(f'Current semester: {cur_semester["NAME"]}, id: {cur_semester["ID"]}')

        try:
            cur_semester_data = get_schedule(
                data_format="table",
                semester=cur_semester['ID'],
                academic_level=1,
                timeout=60,
            )
        except Exception as err:
            logging.error('Aborted: pdfscraper.get_csbs_as_json_columns() failed')
            logging.error(f'Exception occurred:\n{err.args[0]}')
            return

        if cur_semester_data is None:
            logging.error('Aborted: cur_semester_data is None')
            return

        cur_semester_data = rearrange_csbs_data(cur_semester_data)

        timestamp = timezone.now()
        logging.info('Updating data in the database.')

        semester_fields = {
            'semester_name': cur_semester['NAME'],
            'semester_code': cur_semester['ID'],
            'semester_data': json.dumps(cur_semester_data),
            'last_update_datetime': timestamp,
        }

        try:
            semester, created = Semester.objects.update_or_create(
                semester_code=cur_semester['ID'],
                defaults=semester_fields,
            )
            logging.info(f'Successfully {"created" if created else "updated"} Semester: {semester}')

        except Exception as err:
            logging.error(f'Exception occurred while accessing the database\n{err.args[0]}')
        finally:
            logging.info(f'Cron job finished.\nTimestamp: {timestamp}. Time taken: {timezone.now() - start_time}')


def rearrange_csbs_data(data):
    data = json.loads(data)
    data = data['data']
    del data[0]

    course_list, id_dict = [], {}
    cur = 0

    for index, item in enumerate(data):
        item = list(item.values())
        if not item[0]:
            prev = list(data[index - 1].values())
            for i in range(len(item)):
                if not item[i]:
                    item[i] = prev[i]

        if not item[0] in id_dict:
            course_list.append({
                'id': cur,
                'abbr': item[0],
                'title': item[2],
                'credit': item[4],
                'from': item[5],
                'to': item[6],
                'sections': {},
            })
            id_dict[item[0]] = cur
            cur += 1

        section_type = item[1]
        section_days = [0, 0, 0, 0, 0, 0, 0]
        section_start = None
        section_end = None

        while len(section_type) and section_type[0].isdigit():
            section_type = section_type[1:]

        if item[7]:
            for char in item[7]:
                if not char.isalpha():
                    pass
                elif char.lower() == 'm':
                    section_days[0] = 1
                elif char.lower() == 't':
                    section_days[1] = 1
                elif char.lower() == 'w':
                    section_days[2] = 1
                elif char.lower() == 'r':
                    section_days[3] = 1
                elif char.lower() == 'f':
                    section_days[4] = 1
                elif char.lower() == 's':
                    section_days[5] = 1

        if item[8]:
            try:
                section_start, section_end = item[8].split('-')
                section_start = convert_to_mins(section_start)
                section_end = convert_to_mins(section_end)
            except ValueError:
                pass

        section = {
            'code': item[1],
            'days': section_days,
            'start': section_start,
            'end': section_end,
            'enrolled': int(item[9]),
            'capacity': int(item[10]),
            'faculty': item[11],
            'room': item[12],
        }

        if not section_type in course_list[-1]['sections']:
            course_list[-1]['sections'][section_type] = []
        course_list[-1]['sections'][section_type].append(section)

    return course_list


def convert_to_mins(time12):
    time, ampm = time12.split(' ')
    hours, mins = map(int, time.split(':'))

    if hours == 12:
        hours = 0

    if ampm.lower() == 'pm':
        hours += 12

    return 60 * hours + mins
