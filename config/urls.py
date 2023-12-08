"""keste URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path

from app import views

urlpatterns = [
    path("admin/", admin.site.urls, name="admin"),
    path("start", views.startpage, name="startpage"),
    path("", views.app, name="app"),
    path("json", views.json, name="json"),
]
