from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from .models import Semester
from django.utils.safestring import SafeString


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
    semester_data = getattr(semester, 'semester_data')

    context = {
        'page_title': 'Scheduler',
        'name': semester_name,
        'data': SafeString(semester_data),
    }

    return render(req, 'app/scheduler.html', context)
