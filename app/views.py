from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse


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

    return HttpResponse("App")
