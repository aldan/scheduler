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

function daysArrToString(days) {
    const day2letter_dict = {
        0: 'M',
        1: 'T',
        2: 'W',
        3: 'R',
        4: 'F',
        5: 'S',
        6: '?',
    }
    let days_string = "";
    days.forEach(function (val, index) {
        if (val) {
            days_string += day2letter_dict[index] + ' ';
        }
    });
    if (days_string.length === 0) {
        return `Online/Distant`;
    }
    return days_string.slice(0, -1);
}

/* ui manipulation ****************************************************************************************************/

function selectSchedule(id) { /* ui: load courses from schedule with id and call updateScheduleView() */

    const schedule = scheduleList.filter((sch) => {
            return sch.id === id.toString();
        })[0],
        schedule_data = schedule.data;

    localStorage.setItem('lastActiveSchedule', id);
    $('.course-view').remove();

    for (const course_id in schedule_data) {
        addCourseView(course_id);
        const course_params = schedule_data[course_id],
            course_color = course_params['color'];

        if (!course_color) {
            console.log(`no color property for course ${semester_data[course_id].abbr}`);
        } else {
            $(`#course-color-select-${course_id}`).addClass(`background-${course_color}`);
            $(`#course-color-select-${course_id} > div:eq(0) > div.background-${course_color}`).addClass('selected');
        }

        for (const section in course_params) { /* pre-select course sections */
            if (section === 'color') continue;

            $(`#course-section-selectX-option-${course_id}-${section}-${course_params[section]}`).addClass('selectedX');
            $(`#course-section-selectX-${course_id}-${section} div:eq(0)`).text(course_params[section]);
        }
    }

    console.log(`selectSchedule: schedule '${schedule.name}' selected`)
    updateScheduleView(id);
}

function updateScheduleView(id) { /* ui: add events from schedule with id, call addEventToView() */

    const schedule = scheduleList.filter((sch) => {
        return sch.id === id.toString();
    })[0];

    const schedule_data = schedule.data;
    $('.event').remove();
    $('.online-event-card').remove();
    $('.timetable-online-course-list').hide();

    for (const course_id in schedule_data) {

        const course_params = schedule_data[course_id],
            course_data = semester_data[course_id],
            course_color = course_params['color'];

        for (const section in course_params) {
            if (section === 'color') continue;
            addEventToView(section, course_params[section], course_data, course_color);
        }
    }
}

function addEventToView(section, selected_section, course_data, color) { /* ui: add event to timetable */

    const section_data = course_data.sections[section].filter((sec) => {
        return sec.code === selected_section;
    })[0];

    const time_start = section_data.start,
        time_end = section_data.end,
        slot = Math.trunc(time_start / 30),
        slot_len = (time_end - time_start) / 30,
        time_start_str = minutesTo24String(time_start),
        time_end_str = minutesTo24String(time_end),
        color_class = (color) ? `background-${color}` : '';

    for (let day = 0; day < 7; day++) {
        if (section_data.days[day]) {
            if (day === 5 && slot >= 46) { /* day is saturday and time >= 23:00 */
                $(`.timetable-online-course-list`).css('display', 'flex');
                $(`.timetable-online-course-list`).append(`
                    <div class="online-event-card ${color_class}">
                        <b>${course_data.abbr}: ${selected_section}</b><br>
                        <span style="color: rgba(255,255,255,.8)">Online</span>
                    </div>
                `);
                continue;
            }

            $(`.timetable-box table tr:eq(${slot - 13}) td:eq(${day + 1})`).append(`
                <div class="event ${color_class}" style="height: ${100 * slot_len}%">
                    <b>${course_data.abbr}: ${selected_section}</b><br>
                    <span style="color: rgba(255,255,255,.8)">${time_start_str} - ${time_end_str}</span>
                </div>
            `);
        }
    }
}

function addCourseView(id) { /* ui: add course to the list on sidebar */

    const course_data = semester_data.filter((course) => {
        return course.id === parseInt(id);
    })[0];

    console.log('addCourseView():');
    console.log(course_data);

    const generateColorSetHTML = (id) => {

        let html = ``;

        for (const color in named_color_set) {
            html += `<div class="course-color-select-palette-option background-${color}" 
                          onclick="updateCourseColor('${id}', '${color}', this)">
                    <div class="course-color-select-palette-option-tick">&#10003;</div></div>`;
        }

        return html;
    }

    $('#course-list-view').append(`
        <div class="course-view" id="course-view-${id}">
            <div class="course-view-header">
                <span class="course-view-title">${course_data.abbr}: ${course_data.title}</span>
                <span class="course-view-remove" onclick="removeCourseFromSchedule(-1,${id})">&#10006;</span>
            </div>
            <div class="course-view-content">
                <div class="course-view-color">
                    <div class="course-color-select" id="course-color-select-${id}" 
                    onmouseover="updateColorPalettePosition(this)">
                        <div class="course-color-select-palette">
                            ${generateColorSetHTML(id)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);

    for (const section_type in course_data.sections) {

        if (section_type === 'color') continue;

        $(`#course-view-${id} .course-view-content`).append(`
            <div class="course-section">
                <select class="course-section-select" id="course-section-select-${id}-${section_type}" 
                data-course="${id}" data-section="${section_type}" onchange="updateCourseSection(this)">
                    <option value="-1">Select section</option>
                </select>
                <div class="course-section-selectX" id="course-section-selectX-${id}-${section_type}" 
                onmouseover="updateSelectXPosition(this)">
                    <div class="course-section-selectX-selector">${section_type}</div>
                    <div class="course-section-selectX-options"></div>
                </div>
            </div>
        `);

        for (const slot of course_data.sections[section_type]) {
            const str_t = (slot.start) ? `${minutesTo24String(slot.start)} - ${minutesTo24String(slot.end)}` : ``;
            $(`#course-section-selectX-${id}-${section_type} .course-section-selectX-options`).append(`
                <div class="course-section-selectX-option" 
                id="course-section-selectX-option-${id}-${section_type}-${slot.code}"
                onclick="updateCourseSectionCC('${id}','${section_type}','${slot.code}', this)" 
                data-days="${slot.days}" data-starttime="${slot.start}" data-endtime="${slot.end}">
                    <div class="course-section-selectX-option-top">
                        <b class="course-section-selectX-option-name">${slot.code}</b>
                        <span class="course-section-selectX-option-time">${str_t}</span>
                        <span class="course-section-selectX-option-days">${daysArrToString(slot.days)}</span>
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

    $(`#course-view-${id} .course-view-content`).append(`
        <div class="course-view-credits">${course_data.credit} ECTS</div>
    `);

    return 1;
}

function updateSelectXPosition(element) { /* ui fix: prevents selectX-options offset from selectX */

    const selectX_pos = $(element).position(),
        selectX_top = selectX_pos.top,
        selectX_left = selectX_pos.left,
        font_size = parseFloat($('body').css('font-size')),
        selectX_id = $(element).attr('id'),
        selectX_cid = selectX_id.substring(23);

    $(`.course-section-selectX-options`, element).css({top: selectX_top + font_size, left: selectX_left});

    const schedule_id = $('#schedule-selector option:selected').val(),
        schedule = scheduleList.filter((sch) => {
            return sch.id === schedule_id.toString();
        })[0],
        schedule_data = schedule.data;

    let timings = [], cur = 0;
    for (const course_id in schedule_data) {
        const sections = schedule_data[course_id],
            course_data = semester_data[course_id];

        for (const section in sections) {
            if (section === 'color') continue;
            if (selectX_cid === `${course_id}-${section}`) continue;

            const selected_section = sections[section],
                section_data = course_data.sections[section].filter((sec) => {
                    return sec.code === selected_section;
                })[0];
            timings[cur++] = [section_data.start, section_data.end, section_data.days];
        }
    }

    const checkIntersections = (a1, a2, b1, b2) => {

        if (a1 <= b2 && b1 <= a2) return 1;
        return 0;
    }

    $(`.course-section-selectX-options > .course-section-selectX-option`, element).each(function () {

        $(this).removeClass('disabled');

        const starttime = $(this).data('starttime'),
            endtime = $(this).data('endtime'),
            days = JSON.parse(`[${$(this).data('days')}]`);

        if (starttime >= 1380) return;

        for (let day = 0; day < 6; day++) {
            if (!days[day]) continue;

            for (let i = 0; i < cur; i++) {
                if (timings[i][2][day] && checkIntersections(starttime, endtime, timings[i][0], timings[i][1])) {
                    $(this).addClass('disabled');
                    return;
                }
            }
        }
    });
}

function updateColorPalettePosition(element) { /* ui fix: prevents selectX-options offset from selectX */

    let elem_pos = $(element).position(),
        elem_top = elem_pos.top,
        elem_left = elem_pos.left,
        font_size = parseFloat($('body').css('font-size'));

    $(`.course-color-select-palette`, element).css({
        top: elem_top + font_size * 0.8,
        left: elem_left - font_size * 0.5
    });
}

function updateCourseSectionCC(course_id, section, selected_section, elem) { /* ui: updateCourseSection() for selectX */

    if ($(elem).hasClass('disabled')) {
        console.log('updateCourseSectionCC: option not available');
        return;
    }
    const selected_schedule_id = $('#schedule-selector option:selected').val();

    $(`#course-section-selectX-${course_id}-${section} div:eq(0)`).text(selected_section);
    $(`#course-section-selectX-${course_id}-${section} > div:eq(1) > div`).removeClass('selectedX');
    $(elem).addClass('selectedX');

    addCourseToSchedule(selected_schedule_id, course_id, `${section}:${selected_section}`);
}

function updateCourseColor(course_id, selected_color, elem) { /* ui: updateCourseSection() for selectX */

    const selected_schedule_id = $('#schedule-selector option:selected').val();

    $(`#course-color-select-${course_id}`).removeClass().addClass(`course-color-select background-${selected_color}`);

    $(`#course-color-select-${course_id} > div:eq(0) > div`).removeClass('selected');
    $(elem).addClass('selected');

    addCourseToSchedule(selected_schedule_id, course_id, `color:${selected_color}`);
}

/* schedule data manipulation *****************************************************************************************/

function getSchedule(schedule_id) { /*returns schedule with schedule_id, if not specified - last selected is used */

    if (!schedule_id) {
        schedule_id = $('#schedule-selector option:selected').val();
    }

    if (typeof schedule_id !== "string") {
        schedule_id = schedule_id.toString();
    }

    return scheduleList.filter((sch) => {
        return sch.id === schedule_id;
    })[0];
}

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
            updateScheduleView(schedule_id);
            $(`#course-view-${course_id}`).remove();

            break;
        }
    }
}

function isInSchedule(schedule_id, course_id) {

    const schedule = scheduleList.filter((sch) => {
        return sch.id === schedule_id;
    })[0];

    for (const course in schedule.data) {
        if (course === course_id) {
            return 1;
        }
    }

    return 0;
}

function storeScheduleList() { /* data: store schedule list in localStorage for later access in future sessions */

    localStorage.setItem('scheduleList', JSON.stringify(scheduleList));

    console.log('storeScheduleList: scheduleList stored to local storage');
    console.log(scheduleList);
}

/* onReady ************************************************************************************************************/

$(document).ready(() => {

    { /* initialize color scheme */
        const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)'),
            toggle = document.getElementById('theme-toggle');

        if ($('body').hasClass('dark-theme')) {
            toggle.innerHTML = 'Light theme';
            console.log('user prefers dark theme');
        } else if (prefersDarkTheme.matches && !$('body').hasClass('light-theme')) {
            toggle.innerHTML = 'Light theme';
            console.log('user prefers dark theme');
        }

        toggle.addEventListener('click', () => {
            if (prefersDarkTheme.matches) {
                document.body.classList.toggle('light-theme');
                if (toggle.innerHTML === 'Light theme') {
                    setCookie('colorScheme', 'light', 365);
                    toggle.innerHTML = 'Dark theme';
                } else {
                    setCookie('colorScheme', 'dark', 365);
                    toggle.innerHTML = 'Light theme';
                }
            } else {
                document.body.classList.toggle('dark-theme');
                if (toggle.innerHTML === 'Dark theme') {
                    setCookie('colorScheme', 'dark', 365);
                    toggle.innerHTML = 'Light theme';
                } else {
                    setCookie('colorScheme', 'light', 365);
                    toggle.innerHTML = 'Dark theme';
                }
            }
        });
    }

    { /* check if schedule data is relevant for current semester */
        const last_active_semester = localStorage.getItem('lastActiveSemester');

        if (!last_active_semester || semester_name !== last_active_semester) {
            localStorage.removeItem('scheduleList');
            localStorage.setItem('lastActiveSemester', `${semester_name}`);
        }
    }

    { /* load scheduleList from local storage and load last active schedule */
        const schedules = localStorage.getItem('scheduleList'),
            lastActiveSchedule = localStorage.getItem('lastActiveSchedule');

        if (!schedules) {
            localStorage.setItem('scheduleList', JSON.stringify(scheduleList));
            console.log('onReady: scheduleList initialized');
        } else {
            scheduleList = JSON.parse(schedules);
            console.log('onReady: scheduleList loaded');
        }

        console.log(scheduleList);

        if (!lastActiveSchedule) {
            selectSchedule(1);
        } else {
            selectSchedule(lastActiveSchedule);
            document.getElementById('schedule-selector').value = lastActiveSchedule;
        }
    }

    {
        $('#schedule-selector').on('change', () => {
            const selectedSchedule = document.getElementById('schedule-selector').value;
            selectSchedule(selectedSchedule);
        });
    }

    { /* shadow on scroll (timetable header) */
        $('.timetable-box').on('scroll', () => {

            if ($('.timetable-box').scrollTop()) {
                $('.timetable-header').addClass('bottom-shadow');
            } else {
                $('.timetable-header').removeClass('bottom-shadow');
            }
        });
    }

    { /* shadow on scroll (course select) */
        $('#course-list-view').on('scroll', () => {

            if ($('#course-list-view').scrollTop()) {
                $('.sidebar-header').addClass('bottom-shadow');
            } else {
                $('.sidebar-header').removeClass('bottom-shadow');
            }
        });
    }

    $('#course-selector').autocomplete({ /* autocomplete for course selector */
        autoFocus: true,
        delay: 100,
        minLength: 2,
        source: function (req, res) {
            let filtered_course_list = semester_data.filter((course) => {
                return course.abbr.toLowerCase().indexOf(req.term.toLowerCase()) !== -1;
            });

            res($.map(filtered_course_list, (course) => {
                return {
                    label: course.abbr,
                    value: course.id
                };
            }));
        },

        focus: function (event, ui) {
            event.preventDefault();
        },

        select: function (event, ui) {
            let course_name = ui.item.label,
                course_id = ui.item.value,
                schedule_id = $('#schedule-selector option:selected').val();

            $(this).val('');

            if (isInSchedule(schedule_id, course_id)) {
                return false;
            } else {
                addCourseToSchedule(schedule_id, course_id, '');
                addCourseView(course_id);
            }

            event.preventDefault();
        }
    });
});