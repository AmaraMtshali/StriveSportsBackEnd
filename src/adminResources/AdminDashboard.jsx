import loadUsers from './loadUsers.jsx';
import updateRole from './updateRole.jsx';
import removeConfigMenu from './removeConfigMenu.jsx';
import './AdminDashboard.css';
import { UserButton } from '@clerk/clerk-react';
import getBookings from './getBookings.jsx';
import updateStatus from './updateStatus.jsx';
import { alertTitleClasses, Box, List, ListItem, ListItemText, Typography,Button,TextField } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import getUsers from './getUsers.jsx';
import { useState, useEffect } from "react";
import { ToastContainer, toast,Bounce } from 'react-toastify'; //toastify.
import getEvents from './getEvents.jsx';
import deleteBooking from './deleteBooking.jsx';


import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction'; // needed for dayClick
import { formatDate } from '@fullcalendar/core/index.js';
import { useUser } from '@clerk/clerk-react';
import { useRef } from 'react';
import getReports from './getReports.jsx';
import TimePicker from 'react-time-picker'

/*comment*/
let globalVar;
export default function AdminDashboard() {

    //Loading the bookings
     const { user } = useUser(); //what will help me get those emails 

     //the bookings variable is used to store the bookings data
    let bookings;
    
    getBookings().then((data) => {
        //DOM Manipulation
        console.log(data);
        let menu = document.getElementById('bookings');
        menu.innerHTML = '';
        for (let booking of data) {
            if ( booking.status === 'rejected') {
                deleteBooking(booking._id);
            }

            const bookingRow = document.createElement('ul');

            

            const sport = document.createElement('li');
            const time = document.createElement('li');
            const date = document.createElement('li');
            const status = document.createElement('li');

            sport.innerText = booking.sport;
            time.innerText = booking.time;
            date.innerText = booking.date;
            status.innerText = booking.status;
            

            bookingRow.className = 'bookingRow';
            status.className = 'bookingStatus';


            bookingRow.addEventListener('click', () => {//onclick Functionality for each row
                if (status.innerText === 'pending') {
                    status.innerText = 'approved';
                    updateStatus(booking._id, 'approved');
                    status.style.backgroundColor = 'lime';

                } else if (status.innerText === 'approved') {
                    status.innerText = 'rejected';
                    updateStatus(booking._id, 'rejected');
                    status.style.backgroundColor = 'red';

                } else if (status.innerText === 'rejected') {

                    status.innerText = 'pending';
                    updateStatus(booking._id, 'pending');
                    status.style.backgroundColor = 'aquamarine';
                }
                else{
                    alert('Unexpected status');
                }
            })

            //color update
        {
            if (status.innerText === 'approved') {
                status.innerText = 'approved';
                status.style.backgroundColor = 'lime';

            } else if (status.innerText === 'pending') {

                status.innerText = 'pending';
                status.style.backgroundColor = 'aquamarine' ;
            }
        }

            bookingRow.appendChild(sport);
            bookingRow.appendChild(time);
            bookingRow.appendChild(date);
            bookingRow.appendChild(status);
            menu.appendChild(bookingRow);
        }
        
    })


    //Loading the bookings
    function loadBookings(){
        
        const bookingMenu = document.getElementById('bookings');
        const button = document.querySelector('.bookingsMenuButt');
        if (bookingMenu.style.left === '0px'){
            bookingMenu.style.left = '-125vw';
            button.style.right = '1%';
        }
        else{
            bookingMenu.style.left = 0;
            
        }
    }


    //creating the user table 
    const [rows, setRows] = useState([]);

    useEffect(() => {
        getUsers().then((data) => {
            const processedRows = data.map(element => ({
                id: element.id,
                name: element.firstName,
                lastName: element.lastName,
                email: element.emailAddresses[0].emailAddress,
                role: element.publicMetadata.role || "none",
            }));

            setRows(processedRows); //Updates state, triggering re-render
        });
    }, []);

    //Role update functionality
    const roleChange = (row) => {
        localStorage.setItem('userId', row.id);
        const configMenu = document.getElementById('configMenu');
        configMenu.style.left = '40%';
    }

    //Calender
    const calendarRef = useRef(null);
    const [currentEvent, setCurrentEvent] = useState([]);

    //Load Events to calendar
    useEffect(() => {
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            
            getEvents().then((data) => {
                for (let element of data){
                    calendarApi.addEvent({
                        id: element._id,
                        title: element.event,
                        start: `${element.date}T${element.time_from}`,
                        end: `${element.date}T${element.time_to}`,
                        description: element.event_description,
                    });
                }
            });
        }
    }, [calendarRef]);

    //handle event add and cancel

    const handleEventAdd = () => {
        const eventDetails = document.getElementById('eventDetails');
        const eventName = document.getElementById('eventName').value;
        const timePick = document.getElementById('timePick').value;
        const eventText = document.getElementById('eventText').value;
        const timeEnd = document.getElementById('timeEnd').value;
        const date = globalVar;

        const calendarApi = date.view.calendar;
        calendarApi.unselect(); // clear date selection

        if (eventName && timePick && timeEnd){
            eventDetails.style.zIndex = -1;
            calendarApi.addEvent({
                title: eventName,
                start: `${date.startStr}T${timePick}`, 
                end: `${date.startStr}T${timeEnd}`, 
                eventDetails: eventText || 'No details'
            });
            handleEventCancel();
            //send the event to the server
            fetch(`${import.meta.env.VITE_API_URL}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "event": eventName,
                    "date": date.startStr,
                    "time_from": timePick,
                    "time_to": timeEnd,
                    "event_description": eventText || 'No details'
                }),
            });
        }
        else {
            alert('Atleast the event name and time should be provided');
        }

    }

    //event cancelation
    const handleEventCancel = () => {
        const eventDetails = document.getElementById('eventDetails');
        eventDetails.style.display = 'none';
        const eventName = document.getElementById('eventName').value = '';
        const timePick = document.getElementById('timePick').value = '';
        const timeEnd = document.getElementById('timeEnd').value = '';
        const eventText = document.getElementById('eventText').value = '';

    }

    //date click functionality
    const handleDateClick = (date) => {
        const eventDetails = document.getElementById('eventDetails');
        eventDetails.style.display = 'block';
        globalVar = date;
        localStorage.setItem('eventDate', date);
    }

    //event click functionality
    const handleEventClick = (clickInfo) => {
        if (window.confirm(`Are you sure you want to delete this event?`)) {
            clickInfo.event.remove();
        }
    }
    const getemails = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/useremails`);
            const data = await response.json();
            return data; // Assuming the response contains an object with "emails" array
        } catch (error) {
            console.error("Error fetching emails:", error);
            throw new Error("Failed to fetch emails");
        }
    };
    //this is for the resend implementation
    const[subject, setSubject] = useState('');
    const[message, setMessage] = useState('');
    const[emailStatus, setEmailStatus] = useState('');

    const handleSendEmail = async (e) => {
        e.preventDefault();
        
        try {
            // Fetch the emails
            const data = await getemails();
            console.log('Fetched emails:', data.emails);
    
            // Check if emails are present
            if (!data.emails || data.emails.length === 0) {
                setEmailStatus('No emails found.');
                toast.error('No emails found.');
                return;
            }
    
            // Sending the emails
            const response = await fetch(`${import.meta.env.VITE_API_URL}/emails`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                      "subject":subject,
                      "message":message,
                      "emails":data.emails
                  }),
                });
            
                const result = await response.json();
                
                if (response.ok) {
                  setEmailStatus('Emails sent successfully!');
                  toast.success('Emails sent successfully!');
                } else {
                  setEmailStatus(`Failed: ${result.error}`);
                  toast.error('Email failed to send.');
                }
              } catch (error) {
                console.error('Error sending emails:', error);
                setEmailStatus('Email sending failed due to server error.'+ error);
                toast.error('Email failed to send due to server error.');
              }
    }
    //creating the report table 
    const [rows2, setRows2] = useState([]);

    useEffect(() => {
        getReports().then((data) => {
            const processedRows = data.map(element => ({
                id: element._id,
                facility: element.facility,
                issue: element.issue,
                residentInfo: element.residentInfo,
                status: element.status,
                __v: element.__v,
            }));

            setRows2(processedRows); //Updates state, triggering re-render
        });
    }, []);

        

    return(
        <main className='adminDashBoardBody' >
        <h1 className='adminDashboard'>Admin Dashboard</h1>
        
        <section className='configMenu' id='configMenu'>
            <button onClick={()=>updateRole('Facility staff')} className='updateRole'>Facility staff</button>
            <button onClick={()=>updateRole('resident')} className='updateRole'>resident</button>
            <button onClick={()=>updateRole('admin')} className='updateRole'>admin</button>
            <button onClick={()=>updateRole('none')} className='updateRole'>none</button>
            <button onClick={()=>updateRole('removed')} className='updateRole'>removed</button>
            <button onClick={removeConfigMenu} className='updateRole'>complete</button>
        </section>

        <section>
            <section className='userButton'>
                <UserButton></UserButton>
            </section>
            <button onClick={loadBookings} className='bookingsMenuButt'>Booking</button>
        </section>
        
        <section id='bookings' className='bookings'></section>

        <section className='usersTable'>
        <Box>
            <DataGrid
                rows={rows}
                columns={[
                    { field: 'name', headerName: 'Name', flex: 1 },
                    { field: 'lastName', headerName: 'Last Name', flex: 1 },
                    { field: 'email', headerName: 'Email', flex: 2 },
                    { field: 'role', headerName: 'Role', flex: 1,

                        renderCell: (params) => (
                            <button onClick={() => roleChange(params.row)}>
                                {params.value}
                            </button>
                        ),
            
                     },
                ]}
                pageSize={5}
                rowsPerPageOptions={[5]}
                sx={{
                    "& .MuiDataGrid-root": { fontFamily: "Arial, sans-serif" },
                    "& .MuiDataGrid-cell": { fontSize:"large" },
                }}
            
                
            />
        </Box>
        </section>

        
        <section className='calenderAndBookings'>
            <Box className='bookingsBox'>
                <header title='Calendar' className='header'></header>
                <Box flex="1 1 20%">
                    <Typography variant="h4">Events</Typography>
                    <List>
                        {currentEvent.map((event) => (
                            <ListItem
                            key = {event.id}
                            sx = {{ backgroundColor: 'aqua', padding: 2, margin: 1, borderRadius: 2 }}

                            >

                        <ListItemText
                            primary={event.title}
                            secondary={
                                <Typography>
                                  {formatDate(event.start, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                  {" | "}
                                  {formatDate(event.start, { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })} - {formatDate(event.end, 
                                  { hour: '2-digit', minute: '2-digit' })}
                                </Typography>

                            }
                        ></ListItemText>
                        </ListItem>
                        )
                        )}
                    </List>
                </Box>
            </Box>

            <Box className='calenderBox'>
                <FullCalendar
                    ref={calendarRef}
                    height='75vh'
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay',
                    }}
                    initialView='dayGridMonth'
                    editable={true}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    select={handleDateClick}
                    eventClick={handleEventClick}
                    eventsSet={(events) => setCurrentEvent(events)}
                ></FullCalendar>
            </Box>
            
        </section>


        <section className='issuesAndEmails'>
        <section className='usersTable'>
                <Box>
                    <DataGrid
                        rows={rows2}
                        columns={[
                            { field: 'facility', headerName: 'facility', flex: 1 },
                            { field: 'issue', headerName: 'issue', flex: 4 },
                            { field: 'residentInfo', headerName: 'residentInfo', flex: 1 },
                            { field: 'status', headerName: 'status', flex: 1,},
                        ]}
                        pageSize={5}
                        rowsPerPageOptions={[5]}
                        sx={{
                            "& .MuiDataGrid-root": { fontFamily: "Arial, sans-serif" },
                            "& .MuiDataGrid-cell": { fontSize:"large" },
                        }}
                    
                        
                    />
                </Box>
        </section>
        <section className='email-section'>
        <Box sx={{ margin: '50px', padding: '70px', backgroundColor: '#f4f6f8', borderRadius: '15px' }}>
                        <Typography variant="h6" sx={{ marginBottom: '20px', fontWeight: 'bold' }}>
                            Communication Center
                        </Typography>
                        <form onSubmit={handleSendEmail}>
                            <input
                            type="text"
                            placeholder="Subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            style={{
                                width: '100%',
                                marginBottom: '20px',
                                padding: '12px',
                                borderRadius: '5px',
                                border: '1px solid #ccc',
                                backgroundColor: '#fff',
                                fontSize: '16px',
                                color: '#000',         
                                caretColor: '#000',
                            }}
                            required
                            />
                            <textarea
                            placeholder="Message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            style={{
                                width: '100%',
                                height: '120px',
                                marginBottom: '20px',
                                padding: '12px',
                                borderRadius: '5px',
                                border: '1px solid #ccc',
                                backgroundColor: '#fff',
                                fontSize: '16px',
                                color: '#000',         
                                caretColor: '#000',
                            }}
                            required
                            ></textarea>
                            <button
                            type="submit"
                            style={{
                                padding: '10px 20px',
                                fontSize: '16px',
                                borderRadius: '5px',
                                border: 'none',
                                backgroundColor: '#1976d2',
                                color: '#fff',
                                cursor: 'pointer',
                            }}
                            >
                            Send Emails
                            </button>
                        </form>
                        {emailStatus && (
                            <Typography sx={{ marginTop: '20px' }}>{emailStatus}</Typography>
                        )}
                    </Box>          

        </section>
        </section>
        
        <Box className='eventDetails' id='eventDetails'>
                <h3>Date: </h3>
                <h3>Event name:</h3>
                <input title='hello' type="text" className='input' id='eventName'/>
                <h3>Event Time start:</h3>
                <input aria-label="Time" type="time" className='input' id='timePick'/>
                <h3>Event Time end:</h3>
                <input aria-label="Time" type="time" className='input' id='timeEnd'/>
                <h3>Event Details:</h3>
                <textarea name="eventDetails" className='input' id="eventText"></textarea>
                <Box className='eventDetailsButton'>
                <button className='done' onClick={()=>handleEventAdd()}>Add Event</button>
                <button className='done' onClick={()=>handleEventCancel()}>Cancel</button>
                </Box>
        </Box>
        </main>

        
    )
    
}