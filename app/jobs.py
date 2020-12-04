import requests
from django_cron import CronJobBase, Schedule
from .models import Semester
from django.utils import timezone


class GetCourseList(CronJobBase):

    update_period = 360  # in minutes

    schedule = Schedule(run_every_mins=update_period)
    code = 'app.get_course_list'

    def do(self):
        start_time = timezone.now()
        print(f'Cron job started\nCron name: app.get_course_list\nTimestamp: {start_time}\n')

        url_course_data = 'https://registrar.nu.edu.kz/my-registrar/public-course-catalog/json'
        request_timeout = 30  # in seconds

        # getSemester
        print(f'getSemesters: waiting for response..')
        data = {
            'method': 'getSemesters'
        }

        try:
            res = requests.post(url_course_data, data=data, timeout=request_timeout)
            res.raise_for_status()
        except requests.exceptions.Timeout:
            print(f'getSemesters: request timed out')
            return
        except requests.exceptions.RequestException as Err:
            print(f'getSemesters: error occurred\n{Err.args[0]}')
            return
        finally:
            print(f'getSemesters: STATUS {res.status_code}')

        try:
            semester_list_json = res.json()
            last_semester_code = semester_list_json[0]['ID']
            last_semester_name = semester_list_json[0]['NAME']
        except:
            print(f'getSemesters: could not process data')
            return

        print(f'getSemesters: last semester {last_semester_name}')

        # getSearchData
        data = {
            'method': 'getSearchData',
            'searchParams[formSimple]': 'false',
            'searchParams[limit]': '1000',
            'searchParams[page]': '1',
            'searchParams[start]': '0',
            'searchParams[quickSearch]': '',
            'searchParams[sortField]': '-1',
            'searchParams[sortDescending]': '-1',
            'searchParams[semester]': last_semester_code,
            'searchParams[schools]': '',
            'searchParams[departments]': '',
            'searchParams[levels]': '',
            'searchParams[subjects]': '',
            'searchParams[instructors]': '',
            'searchParams[breadths]': '',
            'searchParams[abbrNum]': '',
            'searchParams[credit]': ''
        }

        print(f'getSearchData: waiting for response..')

        try:
            res = requests.post(url_course_data, data=data, timeout=request_timeout)
            res.raise_for_status()
        except requests.exceptions.Timeout as Err:
            print(f'getSearchData: request timed out')
            return
        except requests.exceptions.RequestException as Err:
            print(f'getSearchData: generic error occurred\n{Err.args[0]}')
            return
        finally:
            print(f'getSearchData: STATUS {res.status_code}')

        timestamp = timezone.now()

        try:
            last_semester_data = res.json()['data']
            print(f'getSearchData: data length {len(last_semester_data)}')
        except:
            print(f'getSearchData: could not process data')
            return

        print('Updating data in the database')

        semester_fields = {
            'semester_name': last_semester_name,
            'semester_code': last_semester_code,
            'semester_data': last_semester_data,
            'last_update_datetime': timestamp,
        }

        try:
            semester, created = Semester.objects.update_or_create(
                semester_code=last_semester_code,
                defaults=semester_fields
            )
            print(f'Successfully {"created" if created else "updated"} Semester: {semester}')
        except Exception as Err:
            print(f'Exception occurred while accessing the database\n{Err.args[0]}')
        finally:
            print(f'Database operation finished. Timestamp: {timestamp}')

        print(f'Cron job finished\nTime taken: {timezone.now()-start_time}')
