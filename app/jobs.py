from django_cron import CronJobBase, Schedule
from django.utils import timezone
from .models import Semester

import logging
import public_course_catalog as pcc
import pdfscraper


class GetCourseList(CronJobBase):
    update_period = 360  # in minutes
    schedule = Schedule(run_every_mins=update_period)
    code = 'app.get_course_list'

    def do(self):
        start_time = timezone.now()
        logging.info(f'Cron started: app.get_course_list. Timestamp: {start_time}\n')

        cur_semester = pcc.get_semester()
        if cur_semester is None:
            logging.error('Aborted: cur_semester is None')
            return

        logging.info(f'Current semester: {cur_semester["NAME"]}, id: {cur_semester["ID"]}')

        try:
            cur_semester_data = pdfscraper.get_csbs_as_json_table(
                semester_code=cur_semester['ID'],
                academic_level_code=1,
                verify_params=False
            )
        except Exception as err:
            logging.error('Aborted: pdfscraper.get_csbs_as_json_columns() failed')
            logging.error(f'Exception occurred:\n{err.args[0]}')
            return

        if cur_semester_data is None:
            logging.error('Aborted: cur_semester_data is None')
            return

        timestamp = timezone.now()
        logging.info('Updating data in the database.')

        semester_fields = {
            'semester_name': cur_semester['NAME'],
            'semester_code': cur_semester['ID'],
            'semester_data': cur_semester_data,
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
