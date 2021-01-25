const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar";

const authorizeButton = document.getElementById('gcal-export-auth');
const signoutButton = document.getElementById('gcal-export-signout');

/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
    gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
    gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
    }).then(function () {
        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

        // Handle the initial sign-in state.
        if (gapi.auth2.getAuthInstance().isSignedIn.get()) {
            signoutButton.style.display = 'block';
        }

        authorizeButton.onclick = handleAuthClick;
        signoutButton.onclick = handleSignoutClick;
    }, function (error) {
        console.log(JSON.stringify(error, null, 2));
    });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
    if (isSignedIn) {
        // authorizeButton.style.display = 'none';
        signoutButton.style.display = 'block';
        exportScheduleToCalendar();
    } else {
        // authorizeButton.style.display = 'block';
        signoutButton.style.display = 'none';
    }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
    $('.modal').removeClass('active');
    if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
        gapi.auth2.getAuthInstance().signIn();
    } else {
        exportScheduleToCalendar();
    }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
    gapi.auth2.getAuthInstance().signOut();
}

async function exportScheduleToCalendar() {
    const overlay = $('#overlay'),
        overlay_header = $('#overlay-header'),
        overlay_message = $('#overlay-message');
    overlay.addClass('forced');
    overlay_header.html('WORKING..');

    const onExportFailure = (message) => {
        $('#overlay').removeClass('forced');
        $('#overlay-header').html('EXPORT FAILURE');
        $('#overlay-message').html(`${message}\nClick anywhere to continue`);
    }

    const export_params = $('#export-params').find('> label > input'),
        use_secondary_cal = export_params[0].checked,
        secondary_cal_name = export_params[1].value,
        add_notifications = export_params[2].checked,
        notify_time = export_params[3].value;

    let calendar_id = 'primary',
        event_color_set = {};

    try {
        let color_set = await get_colors();
        color_set = color_set.result.event;
        for (const color_id in color_set) {
            const color = color_set[color_id].background;
            event_color_set[color] = color_id;
        }
        console.log(event_color_set);
    } catch (e) {
        onExportFailure(`Failed to synchronize color set with Google Calendar`);
        return false;
    }

    if (use_secondary_cal && secondary_cal_name) { /* try to create a new calendar */
        try {
            const response = await create_calendar(secondary_cal_name),
                calendar = response.result;
            calendar_id = calendar.id;
        } catch (e) {
            onExportFailure(`Could not create calendar: '${secondary_cal_name}'`);
            return false;
        }
    }

    const schedule_data = getScheduleById().data;
    let event_batch = gapi.client.newBatch();

    const insert_event_request = function (calendar_id, event) {
        return gapi.client.calendar.events.insert({
            'calendarId': calendar_id,
            'resource': event
        });
    };

    for (const course in schedule_data) {
        const course_data = semester_data[course],
            course_params = schedule_data[course];
        let color = named_color_set[course_params.color];   /* white -> #ffffff */
        color = event_color_set[color]; /* #ffffff -> color_id */

        for (const param in course_params) {
            if (param === 'color' || param === 'abbr') continue;
            const section_data = course_data.sections[param].filter((sec) => {
                return sec.code === course_params[param];
            });

            for (const instance of section_data) {
                if (instance.start && !(instance.days[5] && slot >= 46)) { /* online event check */
                    const params = {
                        color: color,
                        add_notifications: add_notifications,
                        notify_time: notify_time
                    }
                    const event = generate_recurring_event(instance, course_data, params);
                    console.log(event);
                    event_batch.add(insert_event_request(calendar_id, event));
                }
            }
        }
    }

    event_batch.then(function (response) {
        console.log(response);
        let success = 0, total = 0;
        for (const event in response.result) {
            if (response.result[event].status === 200) {
                success++;
            }
            total++;
        }

        if (success !== total) {
            onExportFailure(`Failed to export ${total - success}/${total} events in Google Calendar`);
            return false;
        }
    }, function (error) {
        console.log(error);
        onExportFailure(`Failed to send the batch request to Google Calendar`);
        return false;
    });

    // success
    overlay.removeClass('forced');
    overlay_header.html('EXPORT SUCCESSFUL');
    overlay_message.html(`Click anywhere to continue`);
    return true;
}

function generate_recurring_event(instance, course_data, params) {
    // time input format: '1 JAN 21 0:0 UTC+6' -- idk, should be reliable enough..
    const
        start = new Date(Date.parse(
            `${course_data.from.replace(/-/g, ' ')} ${Math.trunc(instance.start / 60)}:${instance.start % 60} UTC+6`
        )),
        end = new Date(Date.parse(
            `${course_data.from.replace(/-/g, ' ')} ${Math.trunc(instance.end / 60)}:${instance.end % 60} UTC+6`
        )),
        last_instance_end = new Date(Date.parse(
            `${course_data.to.replace(/-/g, ' ')} ${Math.trunc(instance.end / 60)}:${instance.end % 60} UTC+6`
        ));

    let reminders = [];
    if (params.add_notifications) {
        if (isNaN(params.notify_time) || params.notify_time < 0) {
            /* bad */
        } else {
            reminders.push({'method': 'popup', 'minutes': params.notify_time})
        }
    }

    let days_str = '';
    const day_specifiers = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    for (let day = 0; day < instance.days.length; day++) {
        if (instance.days[day]) {
            days_str += `,${day_specifiers[day]}`;
        }
    }
    days_str = days_str.substring(1);
    const __recurrence_cm = `${last_instance_end.getUTCMonth() + 1}`,
        __recurrence_cd = `${last_instance_end.getUTCDate()}`,
        recurrence_month = (__recurrence_cm.length === 1) ? `0${__recurrence_cm}` : __recurrence_cm,
        recurrence_date = (__recurrence_cd.length === 1) ? `0${__recurrence_cd}` : __recurrence_cd,
        recurrence_end = `${last_instance_end.getUTCFullYear()}${recurrence_month}${recurrence_date}T000000Z`;

    return {
        'summary': `${course_data.abbr}: ${instance.code}`,
        'location': instance.room,
        'description': `<b>${course_data.abbr}: ${course_data.title}</b><br>Instructed by: ${instance.faculty}`,
        'start': {
            'dateTime': start.toISOString(),
            'timeZone': 'Asia/Almaty'
        },
        'end': {
            'dateTime': end.toISOString(),
            'timeZone': 'Asia/Almaty'
        },
        'recurrence': [
            `RRULE:FREQ=WEEKLY;UNTIL=${recurrence_end};WKST=MO;BYDAY=${days_str}`
        ],
        'reminders': {
            'useDefault': false,
            'overrides': reminders
        },
        'colorId': `${(params.color) ? params.color : '0'}`
    };
}

function get_colors() {
    return new Promise((resolve, reject) => {
        const request = gapi.client.calendar.colors.get();

        request.then(function (response) {
            console.log(response);
            resolve(response);
        }, function (error) {
            console.log(error);
            reject();
        })
    });
}

function create_calendar(calendar_name) {
    return new Promise((resolve, reject) => {
        const calendar = {
            'summary': calendar_name,
            'description': `Class schedule for ${semester_name}`,
            'timeZone': time_zone
        };

        const request = gapi.client.calendar.calendars.insert({
            'resource': calendar
        });

        request.then(function (response) {
            console.log(response);
            resolve(response);
        }, function (error) {
            console.log(error);
            reject();
        });
    });
}
