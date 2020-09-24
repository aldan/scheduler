from datetime import datetime

from django.db import models


class Semester(models.Model):
    semester_name = models.CharField(max_length=20)
    semester_code = models.CharField(max_length=10, unique=True)
    semester_data = models.JSONField()  # this simple technique will cost me 0$/month
    last_update_datetime = models.DateTimeField()

    def __str__(self):
        return self.semester_name

    def updated_recently(self):
        return self.last_update_datetime >= datetime.timezone.now() - datetime.timedelta(hours=12)


"""
# no reason to use it since course-specific data is majorly processed on client-side
class Course(models.Model):
    course_abbr = models.CharField(max_length=20)
    course_name = models.CharField(max_length=100)
    course_credits = models.IntegerField()
    course_school = models.CharField(max_length=50)
    course_school_abbr = models.CharField(max_length=5)
    course_level = models.CharField(max_length=20)
    course_prereq = models.TextField()
    course_coreq = models.TextField()
    course_antireq = models.TextField()
    
    def __str__ (self):
        return self.course_abbr
"""
