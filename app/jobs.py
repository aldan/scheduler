import requests
from django_cron import CronJobBase, Schedule
from .models import Semester
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist
from django.db import Error


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
            print(f'getSemesters: error occurred\n{Err}')
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
            print(f'getSearchData: generic error occurred\n{Err}')
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

        try:
            Semester.objects.get(semester_code=last_semester_code).update(
                semester_data=last_semester_data,
                last_update_datetime=timestamp
            )
            print(f'Successfully updated Semester: {last_semester_name}')
        except ObjectDoesNotExist:
            print(f'Failed to update Semester: {last_semester_name}. Trying to create one..')
            semester = Semester(
                semester_name=last_semester_name,
                semester_code=last_semester_code,
                semester_data=last_semester_data,
                last_update_datetime=timestamp,
            )
            try:
                semester.save()
                print(f'Successfully saved Semester: {last_semester_name}')
            except Exception as Err:
                print(f'Failed to save Semester: {last_semester_name}\n{Err.args[0]}')
        except Exception as Err:
            print(f'Generic error occurred while accessing the database\n{Err.args[0]}')
        finally:
            print(f'Database operation finished. Timestamp: {timestamp}')

        print(f'Cron job finished\nTime taken: {timezone.now()-start_time}')
