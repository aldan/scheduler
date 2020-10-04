// index.js
/* helper functions ***************************************************************************************************/

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

function minutesTo24String(minutes) {

    return `${Math.trunc(minutes / 60)}:${(minutes % 60 < 10) ? '0' : ''}${minutes % 60}`;
}

/* ui manipulation ****************************************************************************************************/

function selectSchedule(id) { /* ui: load courses from schedule with id and call updateScheduleView() */

    const schedule = scheduleList.filter((sch) => {
        return sch.id === id.toString();
    })[0];

    const data = schedule.data;
    $('.course-view').remove();

    for (const course in data) {

        addCourseView(course);
        const cdata = data[course];

        for (const section in cdata) { /* pre-select course sections */
            // $(`#course-section-select-${course}-${section} option[value="${cdata[section]}"]`).prop('selected', true);
            $(`#course-section-selectX-option-${course}-${section}-${cdata[section]}`).addClass('selectedX');
            $(`#course-section-selectX-${course}-${section} div:eq(0)`).text(cdata[section]);
        }
    }

    console.log(`selectSchedule: schedule '${schedule.name}' selected`)
    updateScheduleView(id);
}

function updateScheduleView(id) { /* ui: add events from schedule with id, call addEventToView() */

    const schedule = scheduleList.filter((sch) => {
        return sch.id === id.toString();
    })[0];

    const data = schedule.data;
    $('.event').remove();

    for (const course in data) {

        const cdata = data[course],
            course_data = getCourseData(course),
            [course_abbr, course_name] = $(`#course-view-${course} span:eq(0)`).html().split(': ');

        for (const section in cdata) {
            addEventToView(section, cdata[section], course_data, course_abbr);
        }
    }
}

function addEventToView(section, selected_section, course_data, course_abbr) { /* ui: add event to timetable */

    const section_data = course_data[section].filter((sec) => {
        return sec.code === selected_section;
    })[0];

    const time_start = section_data.starttime,
        time_end = section_data.endtime,
        slot = Math.trunc(time_start / 30),
        slot_len = (time_end - time_start) / 30,
        time_start_str = minutesTo24String(time_start),
        time_end_str = minutesTo24String(time_end);

    for (let day = 0; day < 7; day++) {
        if (section_data.days[day]) {
            $(`.timetable-box table tr:eq(${slot - 13}) td:eq(${day + 1})`).append(`
                <div class="event" style="height: ${100 * slot_len}%">
                    <b>${course_abbr}: ${selected_section}</b><br>
                    <span style="color: rgba(255,255,255,.8)">${time_start_str} - ${time_end_str}</span>
                </div>
            `);
        }
    }
}

function addCourseView(id) { /* ui: add course to the list on sidebar */

    const data = getCourseData(id);

    if (!data) {
        console.log('addCourseView(): could not retrieve data');
        return 0;
    }

    const info = semester_data.filter((course) => {
        return course.COURSEID === id
    })[0];

    console.log('addCourseView():');
    console.log(data);
    console.log(info);

    $('#course-list-view').append(`
        <div class="course-view" id="course-view-${id}">
            <div class="course-view-header">
                <span>${info.ABBR}: ${info.TITLE}</span>
                <span class="course-view-remove" onclick="removeCourseFromSchedule(-1,${id})">&#10006;</span>
            </div>
            <div class="course-view-content"></div>
        </div>`);

    for (const section_name in data) {

        $(`#course-view-${id} .course-view-content`).append(`
            <div class="course-section">
                <select class="course-section-select" id="course-section-select-${id}-${section_name}" data-course="${id}" 
                data-section="${section_name}" onchange="updateCourseSection(this)">
                    <option value="-1">Select section</option>
                </select>
                <div class="course-section-selectX" id="course-section-selectX-${id}-${section_name}">
                    <div class="course-section-selectX-selector">${section_name}</div>
                    <div class="course-section-selectX-options"></div>
                </div>
            </div>
        `);

        for (const slot of data[section_name]) {
            $(`#course-section-select-${id}-${section_name}`).append(`<option value="${slot.code}">${slot.code}</option>`);
            $(`#course-section-selectX-${id}-${section_name} .course-section-selectX-options`).append(`
                <div class="course-section-selectX-option" id="course-section-selectX-option-${id}-${section_name}-${slot.code}"
                onclick="updateCourseSectionCC('${id}','${section_name}','${slot.code}', this)">
                    <div class="course-section-selectX-option-top">
                        <b class="course-section-selectX-option-name">${slot.code}</b>
                        <span class="course-section-selectX-option-time">
                            ${minutesTo24String(slot.starttime)} - ${minutesTo24String(slot.endtime)}
                        </span>
                        <span class="course-section-selectX-option-days">${slot.daysStr}</span>
                        <span class="course-section-selectX-option-cap">${slot.enrolled}/${slot.capacity}</span>
                        <span class="course-section-selectX-option-room">${slot.room}</span>
                    </div>
                    <div class="course-section-selectX-option-bottom">
                        <span class="course-section-selectX-option-faculty">${slot.faculty}</span>
                    </div>
                </div>
            `);
        }
    }

    return 1;
}

function updateCourseSection(element) { /* ui: get selected sections from view and call addCourseToSchedule() */

    const selectedSectionCode = element.options[element.selectedIndex].value,
        course_id = element.getAttribute('data-course'),
        section = element.getAttribute('data-section'),
        selected_schedule_id = $('#schedule-selector option:selected').val();

    addCourseToSchedule(selected_schedule_id, course_id, `${section}:${selectedSectionCode}`);
}

function updateCourseSectionCC(course_id, section, selected_section, elem) { /* ui: updateCourseSection() for selectX */

    const selected_schedule_id = $('#schedule-selector option:selected').val();

    $(`#course-section-selectX-${course_id}-${section} div:eq(0)`).text(selected_section);
    $(`#course-section-selectX-${course_id}-${section} > div:eq(1) > div`).removeClass('selectedX');
    $(elem).addClass('selectedX');

    addCourseToSchedule(selected_schedule_id, course_id, `${section}:${selected_section}`);
}

/* schedule data manipulation *****************************************************************************************/

function addCourseToSchedule(schedule_id, course_id, course_section) { /* data: add/update course data in schedule */

    for (let schedule of scheduleList) {

        if (schedule.id === schedule_id) {

            const course = course_id in schedule.data;

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

    storeScheduleList();

    if (course_section !== '') { /* case: new entry where course data is empty */
        updateScheduleView(schedule_id); /* call updateScheduleView() on course section update */
    }
}

function removeCourseFromSchedule(schedule_id, course_id) { /* data: remove course from schedule */

    if (schedule_id === -1) {
        schedule_id = $('#schedule-selector option:selected').val();
    }

    for (let schedule of scheduleList) {

        if (schedule.id === schedule_id) {

            if (!schedule.data[course_id]) {
                console.log(`removeCourseFromSchedule: course with id=${course_id} does not exist in ${schedule.name}`);
                return;
            }

            delete schedule.data[course_id];
            storeScheduleList();
            $(`#course-view-${course_id}`).remove();

            break;
        }
    }
}

function storeScheduleList() { /* data: store schedule list in localStorage for later access in future sessions */

    localStorage.setItem('scheduleList', JSON.stringify(scheduleList));

    console.log('storeScheduleList: scheduleList stored to local storage');
    console.log(scheduleList);
}

/* course data manipulation *******************************************************************************************/

function storeCourseData(id, data) { /* data: store course data in localStorage to save bandwidth */

    let key = `CourseID${id}`,
        val = {};

    for (const section of data) {

        let section_type = section.ST,
            days = [0, 0, 0, 0, 0, 0, 0],
            [starttime, endtime] = section.TIMES.split('-'),
            faculty = section.FACULTY.split('<br>');

        while (!isNaN(section_type[0]) && section_type.length > 0) {
            section_type = section_type.substring(1);
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

        const convertToMins = (time12) => { /* convert time in 12hr am/pm format to minutes */

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

        for (let prof = 0; prof < faculty.length; prof++) {
            faculty[prof] = faculty[prof].split(',').reverse().join(' ');
        }

        const edited_section = {
            code: section.ST,
            days: days,
            daysStr: section.DAYS,
            starttime: convertToMins(starttime),
            endtime: convertToMins(endtime),
            enrolled: parseInt(section.ENR),
            capacity: parseInt(section.CAPACITY),
            faculty: faculty.join(', '),
            room: section.ROOM
        }

        try {
            val[section_type].push(edited_section);
        } catch (e) {
            val[section_type] = [];
            val[section_type].push(edited_section);
        }
    }

    localStorage.setItem(key, JSON.stringify(val));
}

function getCourseData(id) { /* data: try to get course data from local storage, return data as object */

    const key = `CourseID${id}`,
        data = localStorage.getItem(key);

    if (!data) {
        return 0;
    }

    return JSON.parse(data);
}

/* onReady ************************************************************************************************************/

$(document).ready(() => {

    { /* load scheduleList from local storage and load default schedule */
        const schedules = localStorage.getItem('scheduleList');

        if (!schedules) {
            localStorage.setItem('scheduleList', JSON.stringify(scheduleList));
            console.log('onReady: scheduleList initialized');
        } else {
            scheduleList = JSON.parse(schedules);
            console.log('onReady: scheduleList loaded');
        }

        console.log(scheduleList);
        selectSchedule(1);
    }

    $('#course-selector').autocomplete({ /* autocomplete for course selector */
        autoFocus: true,
        delay: 100,
        minLength: 2,
        source: function (req, res) {
            let filtered_course_list = semester_data.filter((course) => {
                return course.ABBR.toLowerCase().indexOf(req.term.toLowerCase()) !== -1;
            });

            res($.map(filtered_course_list, (course) => {
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
            if (getCourseData(course_id)) {
                addCourseToSchedule(selected_schedule_id, course_id, '');
                addCourseView(course_id);
                return false;
            }

            // todo move get to getCourseData()
            $.get(get_url, (course_data) => {
                addCourseToSchedule(selected_schedule_id, course_id, '');
                storeCourseData(course_id, course_data);
                addCourseView(course_id);
            }).fail(() => {
                alert('Registrar is unavailable');
            });

            event.preventDefault();
        }
    });
});