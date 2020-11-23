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

    localStorage.setItem('lastActiveSchedule', id);

    const data = schedule.data;
    $('.course-view').remove();

    for (const course in data) {

        addCourseView(course);
        const cdata = data[course],
            course_color = cdata['color'];

        if (!course_color) {
            console.log(`no color property for course ${course}`);
        } else {
            $(`#course-color-select-${course}`).addClass(`background-${course_color}`);
            $(`#course-color-select-${course} > div:eq(0) > div.background-${course_color}`).addClass('selected');
        }


        for (const section in cdata) { /* pre-select course sections */

            if (section === 'color') continue;

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
    $('.online-event-card').remove();
    $('.timetable-online-course-list').hide();

    for (const course in data) {

        const cdata = data[course],
            course_data = getCourseData(course),
            [course_abbr, course_name] = $(`#course-view-${course} span:eq(0)`).html().split(': '),
            course_color = cdata['color'];

        for (const section in cdata) {
            if (section === 'color') continue;
            addEventToView(section, cdata[section], course_data, course_abbr, course_color);
        }
    }
}

function addEventToView(section, selected_section, course_data, course_abbr, color) { /* ui: add event to timetable */

    const section_data = course_data[section].filter((sec) => {
        return sec.code === selected_section;
    })[0];

    const time_start = section_data.starttime,
        time_end = section_data.endtime,
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
                        <b>${course_abbr}: ${selected_section}</b><br>
                        <span style="color: rgba(255,255,255,.8)">Online</span>
                    </div>
                `);
                continue;
            }

            $(`.timetable-box table tr:eq(${slot - 13}) td:eq(${day + 1})`).append(`
                <div class="event ${color_class}" style="height: ${100 * slot_len}%">
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
                <span class="course-view-title">${info.ABBR}: ${info.TITLE}</span>
                <span class="course-view-remove" onclick="removeCourseFromSchedule(-1,${id})">&#10006;</span>
            </div>
            <div class="course-view-content">
                <div class="course-view-color">
                    <div class="course-color-select" id="course-color-select-${id}" onmouseover="updateColorPalettePosition(this)">
                        <div class="course-color-select-palette">
                            ${generateColorSetHTML(id)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);

    for (const section_name in data) {

        if (section_name === 'color') continue;

        $(`#course-view-${id} .course-view-content`).append(`
            <div class="course-section">
                <select class="course-section-select" id="course-section-select-${id}-${section_name}" data-course="${id}" 
                data-section="${section_name}" onchange="updateCourseSection(this)">
                    <option value="-1">Select section</option>
                </select>
                <div class="course-section-selectX" id="course-section-selectX-${id}-${section_name}" onmouseover="updateSelectXPosition(this)">
                    <div class="course-section-selectX-selector">${section_name}</div>
                    <div class="course-section-selectX-options"></div>
                </div>
            </div>
        `);

        for (const slot of data[section_name]) {
            $(`#course-section-select-${id}-${section_name}`).append(`<option value="${slot.code}">${slot.code}</option>`);
            $(`#course-section-selectX-${id}-${section_name} .course-section-selectX-options`).append(`
                <div class="course-section-selectX-option" id="course-section-selectX-option-${id}-${section_name}-${slot.code}"
                onclick="updateCourseSectionCC('${id}','${section_name}','${slot.code}', this)" data-days="${slot.days}"
                data-starttime="${slot.starttime}" data-endtime="${slot.endtime}">
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

    $(`#course-view-${id} .course-view-content`).append(`
        <div class="course-view-credits">${info.CRECTS} ECTS</div>
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
        })[0];
    const schedule_data = schedule.data;

    let timings = [], cur = 0;
    for (const course in schedule_data) {
        const sections = schedule_data[course],
            course_data = getCourseData(course);

        for (const section in sections) {
            if (section === 'color') continue;
            if (selectX_cid === `${course}-${section}`) continue;

            const selected_section = sections[section];
            const section_data = course_data[section].filter((sec) => {
                return sec.code === selected_section;
            })[0];
            timings[cur++] = [section_data.starttime, section_data.endtime, section_data.days];
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

function updateCourseSection(element) { /* ui: get selected sections from view and call addCourseToSchedule() */

    const selectedSectionCode = element.options[element.selectedIndex].value,
        course_id = element.getAttribute('data-course'),
        section = element.getAttribute('data-section'),
        selected_schedule_id = $('#schedule-selector option:selected').val();

    addCourseToSchedule(selected_schedule_id, course_id, `${section}:${selectedSectionCode}`);
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
                    alert(`Error while parsing data: section.DAYS not recognized`);
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

    { /* select required color scheme */
        const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)'),
            toggle = document.getElementById('theme-toggle');

        if ($('body').hasClass('dark-theme')) {
            toggle.innerHTML = 'light theme';
            console.log('user prefers dark theme');
        } else if (prefersDarkTheme.matches && !$('body').hasClass('light-theme')) {
            toggle.innerHTML = 'light theme';
            console.log('user prefers dark theme');
        }

        toggle.addEventListener('click', () => {
            if (prefersDarkTheme.matches) {
                document.body.classList.toggle('light-theme');
                if (toggle.innerHTML === 'light theme') {
                    setCookie('colorScheme', 'light', 365);
                    toggle.innerHTML = 'dark theme';
                } else {
                    setCookie('colorScheme', 'dark', 365);
                    toggle.innerHTML = 'light theme';
                }
            } else {
                document.body.classList.toggle('dark-theme');
                if (toggle.innerHTML === 'dark theme') {
                    setCookie('colorScheme', 'dark', 365);
                    toggle.innerHTML = 'light theme';
                } else {
                    setCookie('colorScheme', 'light', 365);
                    toggle.innerHTML = 'dark theme';
                }
            }
        });
    }

    { /* load scheduleList from local storage and load default schedule */
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
                return course.ABBR.toLowerCase().indexOf(req.term.toLowerCase()) !== -1;
            });

            res($.map(filtered_course_list, (course) => {
                return {
                    label: course.ABBR,
                    value: course.COURSEID
                }
            }));
        },

        focus: function (event, ui) {
            event.preventDefault();
        },

        select: function (event, ui) {
            let course_name = ui.item.label,
                course_id = ui.item.value,
                get_url = `/json?method=getCourseById&courseId=${course_id}&semesterId=${semester_code}`,
                schedule_id = $('#schedule-selector option:selected').val();

            $(this).val('');

            // get course data
            if (isInSchedule(schedule_id, course_id)) {
                return false;
            } else if (getCourseData(course_id)) {

                addCourseToSchedule(schedule_id, course_id, '');
                addCourseView(course_id);
            } else {

                // loading string
                $('#course-list-view').append(`
                    <div class="course-view" id="course-view-${course_id}-loading">
                        <div class="course-view-header"><span>Working.</span></div>
                    </div>
                `);

                let course_load_interval = setInterval(() => {
                    $(`#course-view-${course_id}-loading div:eq(0) span`).toggleClass('loading-string');
                }, 500);

                $.get(get_url, (course_data) => {
                    clearInterval(course_load_interval);
                    $(`#course-view-${course_id}-loading`).remove();
                    addCourseToSchedule(schedule_id, course_id, '');
                    storeCourseData(course_id, course_data);
                    addCourseView(course_id);
                }).fail(() => {
                    alert('Registrar is unavailable');
                    clearInterval(course_load_interval);
                    $(`#course-view-${course_id}-loading`).remove();
                });
            }

            event.preventDefault();
        }
    });
});