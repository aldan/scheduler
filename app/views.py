import requests
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.utils.safestring import SafeString
from django.urls import reverse
from .models import Semester


def startpage(req):
    if req.COOKIES.get('isStarted'):
        return HttpResponseRedirect(reverse(app))

    if req.method == "POST":
        res = HttpResponseRedirect(reverse(app))
        res.set_cookie('isStarted', '1')
        return res

    return render(req, 'app/startpage.html')


def app(req):
    if not req.COOKIES.get('isStarted'):
        return HttpResponseRedirect(reverse(startpage))

    semester = Semester.objects.last()
    semester_name = getattr(semester, 'semester_name')
    semester_code = getattr(semester, 'semester_code')
    semester_data = getattr(semester, 'semester_data')
    semester_update_dt = getattr(semester, 'last_update_datetime')

    context = {
        'page_title': 'Scheduler',
        'name': semester_name,
        'code': semester_code,
        'update_dt': semester_update_dt,
        'data': SafeString(semester_data),
    }

    return render(req, 'app/scheduler.html', context)


def json(req):
    method = req.GET.get('method', '')

    if method == 'getSemester':
        semester = Semester.objects.last()
        json_data = [
            getattr(semester, 'semester_name'),
            getattr(semester, 'semester_code'),
            getattr(semester, 'semester_data'),
        ]

    if method == 'getSemesterData':
        semester = Semester.objects.last()
        json_data = getattr(semester, 'semester_data')

    if method == 'getCourseById':
        course_id = req.GET.get('courseId', '')
        if course_id == '':
            return JsonResponse({'error': 'courseId not specified'})

        semester_id = req.GET.get('semesterId', '')
        if semester_id == '':
            return JsonResponse({'error': 'semesterId not specified'})

        data = {
            'method': 'getSchedule',
            'courseId': course_id,
            'termId': semester_id,
        }

        try:
            req_url = 'https://registrar.nu.edu.kz/my-registrar/public-course-catalog/json'
            res = requests.post(req_url, data=data, timeout=30)
            res.raise_for_status()
        except requests.exceptions.Timeout:
            return JsonResponse({'error': 'request timed out'})
        except requests.exceptions.RequestException as Err:
            return JsonResponse({'error': Err.args[0]})

        json_data = res.json()

    return JsonResponse(json_data, safe=False)
