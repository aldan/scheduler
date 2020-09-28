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
        if (cookie.indexOf(name) == 0) {
            return cookie.substring(name.length);
        }
    }
    return '';
}

function selectSchedule(schedule) {

    //todo selectSchedule
}

$(document).ready(function () {

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
                get_url = `/json?method=getCourseById&courseId=${course_id}&semesterId=${semester_code}`;

            // get course data
            let course = $.get(get_url, function (course_data) {
                // add course if not in selected schedule
                let selected_schedule = $('#schedule-selector option:selected').val();
                for (let schedule of scheduleList) {
                    if (schedule.id === selected_schedule) {
                        let course = course_id in schedule.data;
                        if (course === undefined || !course) {
                            schedule.data[course_id] = [];
                        }
                        break;
                    }
                }

                // todo append course to list
                console.log(course_data);
            });

            $(this).val('');
            event.preventDefault();
        }
    });

});