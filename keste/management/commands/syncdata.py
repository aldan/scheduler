"""
Custom django-admin command
https://docs.djangoproject.com/en/5.0/howto/custom-management-commands/

Sync course data with registrar
"""
import json

import nuregi
from django.core.management.base import BaseCommand
from django.utils import timezone

from keste.models import Semester


class Command(BaseCommand):
    help = "Sync course data with registrar"

    def add_arguments(self, parser):
        pass

    def handle(self, *args, **options):
        scraper = nuregi.Scraper(timeout=30, ignore_ssl=True)
        current_semester = scraper.get_last_published_semester()
        print(current_semester)
        current_semester["NAME"] = "Fall 2024"  # gonna fix soon frfr x2
        semester_data = scraper.get_course_schedule(
            semester=current_semester["ID"], academic_level=1
        )
        semester_data = rearrange_csbs_data(semester_data)

        semester_fields = {
            "semester_name": current_semester["NAME"],
            "semester_code": current_semester["ID"],
            "semester_data": json.dumps(semester_data),
            "last_update_datetime": timezone.now(),
        }

        semester, _ = Semester.objects.update_or_create(
            semester_code=current_semester["ID"],
            defaults=semester_fields,
        )
        self.stdout.write(self.style.SUCCESS(f"{semester.semester_name} data updated"))


# pylint: disable=consider-using-enumerate,too-many-branches
def rearrange_csbs_data(data):
    data = json.loads(data)
    data = data["data"]
    del data[0]
    data = [list(item.values())[2:] for item in data]

    course_list, id_dict = [], {}
    cur = 0

    for index, item in enumerate(data):
        if not item[0]:
            prev = data[index - 1]
            for i in range(len(item)):
                if not item[i]:
                    item[i] = prev[i]

        if not item[0] in id_dict:
            course_list.append(
                {
                    "id": cur,
                    "abbr": item[0],
                    "title": item[2],
                    "credit": item[4],
                    "from": item[5],
                    "to": item[6],
                    "sections": {},
                }
            )
            id_dict[item[0]] = cur
            cur += 1

        item[1] = item[1].replace(" ", "")
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
                elif char.lower() == "m":
                    section_days[0] = 1
                elif char.lower() == "t":
                    section_days[1] = 1
                elif char.lower() == "w":
                    section_days[2] = 1
                elif char.lower() == "r":
                    section_days[3] = 1
                elif char.lower() == "f":
                    section_days[4] = 1
                elif char.lower() == "s":
                    section_days[5] = 1

        if item[8]:
            try:
                section_start, section_end = item[8].split("-")
                section_start = convert_to_mins(section_start)
                section_end = convert_to_mins(section_end)
            except ValueError:
                pass

        section = {
            "code": item[1],
            "days": section_days,
            "start": section_start,
            "end": section_end,
            "enrolled": int(item[9]),
            "capacity": int(item[10]),
            "faculty": item[11],
            "room": item[12],
        }

        if not section_type in course_list[-1]["sections"]:
            course_list[-1]["sections"][section_type] = []
        course_list[-1]["sections"][section_type].append(section)

    return course_list


def convert_to_mins(time12):
    time, ampm = time12.split(" ")
    hours, mins = map(int, time.split(":"))

    if hours == 12:
        hours = 0

    if ampm.lower() == "pm":
        hours += 12

    return 60 * hours + mins
