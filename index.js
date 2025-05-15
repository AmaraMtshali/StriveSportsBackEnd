// server/index.js

const express = require('express')
const mongoose = require('mongoose')
const puppeteer = require('puppeteer') //the thing for downloading snapshots of dashboards
const cors = require('cors')
require('dotenv').config({path:'.env'});
const UserModel = require('./models/sportsbooking')
const ReportModel = require('./models/reports')
const TempEventModel = require('./models/events')
const {Resend} = require('resend');
const axios = require('axios'); // Required for Clerk API calls
const nodemailer = require('nodemailer'); //for nodemailer
const { clerkClient } = require('@clerk/clerk-sdk-node');  // correct import

const fs = require('fs');
const path = require('path');
const {jsPDF} = require('jspdf');
require('jspdf-autotable'); //for table formatting.



const {createClerkClient} = require('@clerk/clerk-sdk-node');
const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

//const {clerk } = clerk({apikey:process.env.CLERK_SECRET_KEY}); // use this to get emails

const app = express()
//app.use(cors())
app.use(express.json())
app.use(cors());

app.use('/csv-data', express.static(path.join(__dirname, 'data'))); 

const ATLAS_URL=process.env.ATLAS_URL;
const VITE_CLERK_PUBLISHABLE_KEY=process.env.VITE_CLERK_PUBLISHABLE_KEY;
const resend =new Resend(process.env.RESEND_API_KEY);
const CLERK_SECRET_KEY=process.env.CLERK_SECRET_KEY;

//node mailer transporter


mongoose.connect(ATLAS_URL,{
    useNewUrlParser: true,
    useUnifiedTopology:true

})
.then(()=>console.log("Mongodb connected"))
.catch((err)=> console.error("Mongodb connection error",err));

//check is booking slot is available
app.post('/check-booking', async (req, res) => {
    const { sport, date, time } = req.body;
    try {
        // Check if the booking already exists
        const exists = await UserModel.findOne({ sport, date, time });
        if (exists) {
          return res.status(409).json({ message: 'Time slot already booked' });
        }
    
        // If not, return a success message
        res.status(200).json({ message: 'Time slot available' });
      } catch (error) {
        console.error("Error checking booking:", error);
        res.status(500).json({ message: 'Internal server error' });
      }
    
  });

// allows the resident to make a booking.
// URL to make posts https://localhost:3000/bookings  
app.post('/bookings',async (req,res)=>{
    try {
        const {sport,date,time,residentInfo} = req.body;
        const newBooking = new UserModel({
            sport,
            date,
            time,
            residentInfo
        });
        await newBooking.save();
        res.status(201).json({message:"Booking successful"})
    } catch (error) {
        console.error("Error saving booking",error);
        res.status(500).json({error: "Failed to save booking"})
    }
}); 

// allowing the admin to retrieve the bookings.
//URL to get bookings http://localhost:3000/bookings admin run get method
app.get('/bookings', async (req, res) => {
    try {
        const bookings = await UserModel.find();
        res.json(bookings);
    } catch (err) {
        console.error('Failed to fetch bookings',err);
        res.status(500).json({ error: "Failed to fetch bookings" });
    }
});
//for testing server.
app.get('/', (req, res) => {
    res.send('Server is running!');
  });
  
//approved bookings fetch
app.get('/bookings/approved', async (req, res) => {
    try {
        const approvedBookings = await UserModel.find(
            { status: "approved" },
            { sport: 1, date: 1, time: 1, _id: 0 } // Only include these fields
        )
        
        res.json(approvedBookings);
    } catch (err) {
        console.error('Failed to fetch approved bookings', err);
        res.status(500).json({ error: "Failed to fetch calendar events" });
    }
});
//update the booking status (approved or reject)
//URL for approve or reject http:localhost:3000/bookings/:id 
app.post('/bookings/:id', async (req, res) => {
    const { status } = req.body;
    if (!['approved', 'rejected','pending'].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
    }
    try {
        const updated = await UserModel.findByIdAndUpdate( //changed booking var to updated
            req.params.id,
            { status },
            { new: true }
        );
        res.json({ message: `Booking ${status}`, booking:updated });
    } catch (error) {
        console.error("Error updating booking status", error);
        res.status(500).json({ error: "Failed to update booking" });
    }
});

// Delete a booking from admin dashboars
//URL for  http:localhost:3000/bookings/:id 
app.delete('/bookings/:id', async (req, res) => {
    try {
        await UserModel.findByIdAndDelete(req.params.id);
        res.json({ message: 'Booking deleted' });
    } catch (error) {
        console.error('Error deleting booking', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

{/*code for the model for reports.
 allows the resident to make a report .
 URL to make posts https://localhost:3000/reports */} 
app.post('/reports',async (req,res)=>{

    try {
        const {facility,issue,residentInfo} = req.body;
        {/*// Get the start and end of today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // Check if the user already submitted a report today
        const existingReport = await Report.findOne({
            residentInfo: residentInfo,
            createdAt: { $gte: startOfToday, $lte: endOfToday }
        });

        if (existingReport) {
            return res.status(400).json({ message: "You have already submitted a report today." });
        } */}
        const newReport = new ReportModel({
            facility,
            issue,
            residentInfo
        });
        await newReport.save();
        res.status(201).json({message:"Report successful"})
    } catch (error) {
        console.error("Error saving report",error);
        res.status(500).json({error: "Failed to save report"})
    }
}); 

{/* allowing the admin to retrieve the bookings.
URL to get bookings http://localhost:3000/reports admin run get method*/}
app.get('/reports', async (req, res) => {
    try {
        const reports = await ReportModel.find();
        res.json(reports);
    } catch (err) {
        console.error('Failed to fetch reports',err);
        res.status(500).json({ error: "Failed to fetch reports" });
    }
});

{/*update the booking status (approved or reject)

URL for approve or reject http:localhost:3000/reports/:id */}
app.post('/reports/:id', async (req, res) => {
    const { status } = req.body;
    if (!['In progress', 'Done','Pending'].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
    }
    try {
        const updatedreports = await ReportModel.findByIdAndUpdate( 
            req.params.id,
            { status },
            { new: true }
        );
        res.json({ message: `Reporting ${status}`, booking:updatedreports });
    } catch (error) {
        console.error("Error updating report status", error);
        res.status(500).json({ error: "Failed to update report" });
    }
});

{/* Delete a booking from admin dashboars
  URL for  http:localhost:3000/reports/:id */}
app.delete('/reports/:id', async (req, res) => {
    try {
        await ReportModel.findByIdAndDelete(req.params.id);
        res.json({ message: 'Report deleted' });
    } catch (error) {
        console.error('Error deleting report', error);
        res.status(500).json({ error: 'Failed to delete report' });
    }
});

{/* Implementing the events functionality
  URL for  http:localhost:3000/emails */}
app.post('/events',async (req,res)=>{
    const {event,date,time_from,time_to,event_description} = req.body;
    console.log("POST /events called with:", req.body); // Add this line
    try {
        const newEvent = new TempEventModel({
            event,
            date,
            time_from,
            time_to,
            event_description
        });
        await newEvent.save();
        res.status(201).json({message:"Event successful"})
    } catch (error) {
        console.error("Error saving event",error);
        res.status(500).json({error: "Failed to save event"})
    }
});

{/* Retrieve the events*/}
app.get('/events', async (req, res) => {
    try {
        const events = await TempEventModel.find();
        res.json(events);
    } catch (err) {
        console.error('Failed to fetch events',err);
        res.status(500).json({ error: "Failed to fetch events" });
    }
});
  

app.post('/emails', async (req, res) => {
    const { subject, message, emails } = req.body;
  
    if (!emails || emails.length === 0) {
      return res.status(400).json({ error: 'No user emails provided' });
    }
  
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body>
        <h2>StriveSports Community</h2>
        <p>${message}</p>
        <p>Thank you,<br>StriveSports Team</p>
      </body>
      </html>
    `;
  
    try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
    
        for (const email of emails) {
          await transporter.sendMail({
            from: `"StriveSports Team" <${process.env.EMAIL_USER}>`,
            to: email,
            subject,
            html: htmlContent,
          });
        }
  
      //await resend.batch.send(messages);  // Correct batch call
  
      res.status(200).json({ message: `Emails sent to ${emails.length} users.`,
        emails: emails  });
    } catch (error) {
      console.error('Email sending failed:', error);
      res.status(500).json({
        error: 'Email sending failed',
        details: error.response?.data || error.message || 'Unknown error',
      });
    }
  });
  


  app.get('/useremails', async (req, res) => {
    try {
      // Fetch all users (you can paginate if you have many)
      const result = await clerk.users.getUserList({ limit: 10 });

    console.log('Full Clerk user result:', result);

    const users = Array.isArray(result.data) ? result.data : result;
    
    // Check the structure of each user
    users.forEach((user, i) => {
      console.log(`User ${i + 1}:`, user);
    });

    const emails = users.flatMap(u =>
      Array.isArray(u.emailAddresses)
        ? u.emailAddresses.map(e => e.emailAddress)
        : []
    );

    res.json({ emails });
  } catch (err) {
    console.error('Clerk fetch failed:', err);
    res.status(500).json({ error: 'Failed to fetch Clerk users', details: err.message });
    }
  });

  //for getting users
  app.get('/users', async(req, res) => {

    try{
        const users= await clerk.users.getUserList();

        res.status(200).send(users);
    }
    catch (error) {
        res.status(500).send({ errorMessage: error.message });
    }
})

{/* this the dashboard implementation using the puppeteer, */}
// app.get('/download-dashboard/:type', async (req, res) => {
//   const { type } = req.params;

//   const dashboardURLs = {
//     maintenance: 'https://charts.mongodb.com/charts-project-0-hqkmgki/embed/dashboards?id=680810f8-19dd-4115-84d0-1a597dcd4c43&theme=light&autoRefresh=true&maxDataAge=3600&showTitleAndDesc=false&scalingWidth=scale&scalingHeight=scale',
//     booking: 'https://charts.mongodb.com/charts-project-0-hqkmgki/embed/dashboards?id=d7683d19-69a9-415c-bb7b-3b7f97a53ac1&theme=light&autoRefresh=true&maxDataAge=3600&showTitleAndDesc=false&scalingWidth=scale&scalingHeight=scale',
//   };

//   const url = dashboardURLs[type];
//   if (!url) {
//     return res.status(400).send('Invalid dashboard type');
//   }

//   try {
//     const browser = await puppeteer.launch({
//       headless: 'new',
//       args: ['--no-sandbox', '--disable-setuid-sandbox'],
//     });

//     const page = await browser.newPage();
//     await page.setViewport({ width: 1280, height: 1000 });
//     await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

//     await page.waitForTimeout(8000); //allowing ample time for mongodb to load charts.

//     const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

//     await browser.close();

//     res.set({
//       'Content-Type': 'application/pdf',
//       'Content-Disposition': `attachment; filename=${type}_dashboard.pdf`,
//       'Content-Length': pdfBuffer.length,
//     });

//     res.send(pdfBuffer);
//   } catch (error) {
//     console.error('PDF generation error:', error);
//     res.status(500).send('Failed to generate PDF');
//   }
// });

{/* downloading them by charts instead */}
app.get('/download-dashboard/:type', async (req, res) => {
  const { type } = req.params;

  // Replace these with actual public chart links
  const chartURLs = {
    maintenance: [
      'https://charts.mongodb.com/charts-project-0-hqkmgki/embed/charts?id=ba7f3462-f008-442c-8e6a-cdf6b2531805&maxDataAge=3600&theme=light&autoRefresh=true',
      'https://charts.mongodb.com/charts-project-0-hqkmgki/embed/charts?id=1da762c4-ec56-4de2-8dcf-af22567f0870&maxDataAge=3600&theme=light&autoRefresh=true',
      'https://charts.mongodb.com/charts-project-0-hqkmgki/embed/charts?id=592e210b-d260-4d1d-b0d1-75964db0bbdd&maxDataAge=3600&theme=light&autoRefresh=true',
      'https://charts.mongodb.com/charts-project-0-hqkmgki/embed/charts?id=90847db4-4b68-4e28-bc38-285561599a84&maxDataAge=3600&theme=light&autoRefresh=true',
      'https://charts.mongodb.com/charts-project-0-hqkmgki/embed/charts?id=ebe1d823-5f12-470f-9031-da7e3fb5c0ba&maxDataAge=3600&theme=light&autoRefresh=true'
    ],
    booking: [
      'https://charts.mongodb.com/charts-project-0-hqkmgki/embed/charts?id=8d9fbf42-5692-4520-b8e7-010d1877448f&maxDataAge=3600&theme=light&autoRefresh=true',
      'https://charts.mongodb.com/charts-project-0-hqkmgki/embed/charts?id=99f8ecd5-c199-4d20-ab62-311eafb409fb&maxDataAge=3600&theme=light&autoRefresh=true',
      'https://charts.mongodb.com/charts-project-0-hqkmgki/embed/charts?id=8fbc4b53-ec41-49d5-8510-7b018452f58b&maxDataAge=3600&theme=light&autoRefresh=true',
      'https://charts.mongodb.com/charts-project-0-hqkmgki/embed/charts?id=b411da1b-f661-4f64-9653-8ff705130d11&maxDataAge=3600&theme=light&autoRefresh=true',
      'https://charts.mongodb.com/charts-project-0-hqkmgki/embed/charts?id=216e7bdb-9e84-4c10-be8a-ad66c6577132&maxDataAge=3600&theme=light&autoRefresh=true',
      'https://charts.mongodb.com/charts-project-0-hqkmgki/embed/charts?id=1b11d566-b4a6-4bf0-b0a2-296adc467b84&maxDataAge=3600&theme=light&autoRefresh=true'
    ]
  };

  const urls = chartURLs[type];
  if (!urls) return res.status(400).send('Invalid dashboard type');

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const pdf = new (require('jspdf'))();
    let isFirstPage = true;

    for (const url of urls) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });
      await page.waitForTimeout(6000); // wait for chart to render

      const chartBuffer = await page.screenshot({ fullPage: true });
      const imgBase64 = chartBuffer.toString('base64');

      if (!isFirstPage) pdf.addPage();
      pdf.addImage(imgBase64, 'PNG', 10, 20, 180, 100);
      isFirstPage = false;

      await page.close();
    }

    await browser.close();

    const pdfOutput = pdf.output('arraybuffer');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${type}_charts.pdf`,
      'Content-Length': pdfOutput.byteLength
    });

    res.send(Buffer.from(pdfOutput));
  } catch (err) {
    console.error('Error generating chart PDF:', err);
    res.status(500).send('Failed to generate PDF');
  }
});

//csv file downloading and formating api
app.get('/download-csv/:type', (req, res) => {
  const { type } = req.params;

  const filePaths = {
    maintenance: path.join(__dirname, 'data', 'maintenance.csv'),
    booking: path.join(__dirname, 'data', 'booking.csv')
  };

  const filePath = filePaths[type];
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('CSV file not found for this dashboard');
  }

  res.download(filePath, `${type}_dashboard_data.csv`);
});


const PORT = process.env.PORT || 3000;
app.listen(PORT,() =>{
    console.log(`Server is listening on port ${PORT}`)
})

{/*
    the :id is the MongoDB document _id taht the post response returns ,this allows you to path on
    the specific id huli
    
    - to use these create a button for rejecting or approve and look at the path thing the status is a new 
    column that will be added to the database so when a resident sends a booking we just make their
    status to be pending.
    
    
    */}