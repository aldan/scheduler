// cookies manipulation
function setCookie(name, value, expires) {

    let date = new Date();
    date.setTime(date.getTime() + (expires * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

function getCookie(name) {

    name += '=';
    let cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length);
        }
    }
    return '';
}

// helper functions for schedule manipulation
function selectSchedule(id) {

    //todo selectSchedule
}

function updateScheduleList() {

    sessionStorage.setItem('scheduleList', JSON.stringify(scheduleList));

    console.log('updateScheduleList: scheduleList updated');
    console.log(scheduleList);
}

function updateScheduleView() {

}

function addCourseToSchedule(schedule_id, course_id, course_section) {

    for (let schedule of scheduleList) {

        if (schedule.id === schedule_id) {

            let course = course_id in schedule.data;

            if (course === undefined || !course) {
                schedule.data[course_id] = {};
            }

            if (course_section !== '') {
                let [section, value] = course_section.split(':');
                schedule.data[course_id][section] = value;
            }

            break;
        }
    }

    updateScheduleList();
    updateScheduleView();
}

// helper functions for course data manipulation
function addCourseDataToStorage(id, data) {

    let key = `CourseID${id}`;
    let val = {};

    for (const section of data) {
        let stype = section.ST,
            days = [0, 0, 0, 0, 0, 0, 0],
            [starttime, endtime] = section.TIMES.split('-');

        while (!isNaN(stype[0]) && stype.length > 0) {
            stype = stype.substring(1);
        }

        for (let i = 0; i < section.DAYS.length; i++) {
            switch (section.DAYS[i]) {
                case 'M':
                    days[0] = 1;
                    break;
                case 'T':
                    days[1] = 1;
                    break;
                case 'W':
                    days[2] = 1;
                    break;
                case 'R':
                    days[3] = 1;
                    break;
                case 'F':
                    days[4] = 1;
                    break;
                case 'S':
                    days[5] = 1;
                default:
                // skip
            }
        }

        const convertToMins = (time12) => {

            let [time, ampm] = time12.split(' '),
                [hours, mins] = time.split(':');

            hours = parseInt(hours);
            mins = parseInt(mins);

            if (hours === 12) {
                hours = 0;
            }

            if (ampm === 'PM') {
                hours += 12;
            }

            return 60 * hours + mins;
        }

        let edit_section = {
            code: section.ST,
            days: days,
            starttime: convertToMins(starttime),
            endtime: convertToMins(endtime),
            enrolled: parseInt(section.ENR),
            capacity: parseInt(section.CAPACITY),
            faculty: section.FACULTY,
            room: section.ROOM
        }

        try {
            val[stype].push(edit_section);
        } catch (e) {
            val[stype] = [];
            val[stype].push(edit_section);
        }
    }

    sessionStorage.setItem(key, JSON.stringify(val));
}

function getCourseDataFromStorage(id) {

    let key = `CourseID${id}`,
        data = sessionStorage.getItem(key);

    if (!data) {
        return 0;
    }

    return JSON.parse(data);
}

function addCourseView(id) {

    let data = getCourseDataFromStorage(id);

    if (!data) {
        console.log('addCourseView(): could not retrieve data');
        return 0;
    }

    let info = semester_data.filter((course) => {
        return course.COURSEID === id
    })[0];

    console.log('addCourseView():');
    console.log(data);
    console.log(info);

    $('#course-list-view').append(`<div class="course-view" id="course-view-${id}"><div>${info.ABBR}: ${info.TITLE}</div></div>`);

    for (const section_name in data) {
        $(`#course-view-${id}`).append(`
            <div class="course-section">
                <label for="course-section-select-${id}-${section_name}">${section_name}</label>
                <select id="course-section-select-${id}-${section_name}" data-course="${id}" 
                data-section="${section_name}" onchange="updateCourseSection(this)">
                    <option value="-1">Select section</option>
                </select>
            </div>
        `);
        let iterator = 0;
        for (const slot of data[section_name]) {
            $(`#course-section-select-${id}-${section_name}`).append(`<option value="${slot.code}">${slot.code}</option>`);
        }
    }

    return 1;
}

function updateCourseSection(element) {

    let selectedSectionCode = element.options[element.selectedIndex].value,
        course_id = element.getAttribute('data-course'),
        section = element.getAttribute('data-section'),
        selected_schedule_id = $('#schedule-selector option:selected').val();

    addCourseToSchedule(selected_schedule_id, course_id, `${section}:${selectedSectionCode}`);
}

$(document).ready(function () {

    // load schedule list from cookie
    {
        let schedules = sessionStorage.getItem('scheduleList');

        if (!schedules) {
            sessionStorage.setItem('scheduleList', JSON.stringify(scheduleList));
            console.log('onReady: scheduleList initialized');
        } else {
            scheduleList = JSON.parse(schedules);
            console.log('onReady: scheduleList loaded');
        }

        console.log(scheduleList);
        selectSchedule(1);
    }

    // // Search filter for Course Selector
    // $('#course-selector').on('input', function () {
    //     filteredCourseList = filtered_course_list;
    //     // if (filtered_course_list.length <= 10) {
    //     //     $('#filtered-course-list').empty();
    //     //     for (const course of filtered_course_list) {
    //     //         $('#filtered-course-list').append(`
    //     //                     <div class="filtered-course" data-id="${course.COURSEID}" onclick="selectCourse(this)">
    //     //                         ${course.ABBR}
    //     //                     </div>
    //     //                 `);
    //     //     }
    //     //     $('#filtered-course-list').show();
    //     // } else {
    //     //     $('#filtered-course-list').hide();
    //     // }
    // });

    // Autocomplete for Course Selector
    $('#course-selector').autocomplete({
        autoFocus: true,
        delay: 100,
        minLength: 2,
        source: function (req, res) {
            let filtered_course_list = semester_data.filter(function (course) {
                return course.ABBR.toLowerCase().indexOf(req.term.toLowerCase()) !== -1;
            });

            res($.map(filtered_course_list, function (course) {
                return {
                    label: course.ABBR,
                    value: course.COURSEID
                }
            }));
        },

        select: function (event, ui) {
            let course_name = ui.item.label,
                course_id = ui.item.value,
                get_url = `/json?method=getCourseById&courseId=${course_id}&semesterId=${semester_code}`,
                selected_schedule_id = $('#schedule-selector option:selected').val();

            $(this).val('');
            // todo loading anime
            // get course data
            // todo normal check if course is in schedule
            if (getCourseDataFromStorage(course_id)) {
                addCourseToSchedule(selected_schedule_id, course_id, '');
                addCourseView(course_id);
                return false;
            }

            $.get(get_url, function (course_data) {
                addCourseToSchedule(selected_schedule_id, course_id, '');
                addCourseDataToStorage(course_id, course_data);
                addCourseView(course_id);
            });

            event.preventDefault();
        }
    });
});