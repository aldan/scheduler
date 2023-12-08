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
        return (
            self.last_update_datetime
            >= datetime.timezone.now() - datetime.timedelta(hours=12)
        )
