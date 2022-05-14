const express = require('express')
const app = express()
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;


app.use(cors())
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7tzvo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try{
        await client.connect();
        const serviceCollection = client.db('doctor_portal').collection('services');
        const bookingCollection = client.db('doctor_portal').collection('bookings');

        app.get('/service', async(req, res)=>{
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });



        // Warning 
        // This is not the proper way to query
        // After learning more about mongodb. use aggregate, pipeline, lookup, match, group
        app.get('/available', async(req, res) => {
          const date = req.query.date;

          // step-1: get all services

          const services = await serviceCollection.find().toArray();

          // step-2: get the booking of the day

          const query = {date: date};
          const bookings = await bookingCollection.find(query).toArray();

          // setp-3: for each service 

          services.forEach(service => {
            // find the booking of that service
            const serviceBookings = bookings.filter(b => b.treatmentName === service.name);
            // select slots for the services bookings
            const booked = serviceBookings.map(s => s.slot);
            // select those slots that are not in booked slots
            const available = service.slots.filter(s => !booked.includes(s));
            // select available to slots to make it easier
            service.slots = available;
          })


          res.send(services)
        })

        /**
         * App Naming Convention 
         * 
         * app.get('/booking') // get all the booking in this collections
         * app.get('/booking/:id) // get a specific booking
         * app.post('/booking) // add a new booking
         * app.patch('/booking/:id) // update a specific booking
         * app;delete('/booking/:id) // delete a specific booking
        */

        
        
        app.get('/booking', async(req, res) => {
          const patient = req.query.patient;
          const query = {patient: patient};
          const bookings = await bookingCollection.find(query).toArray();
          res.send(bookings)
        })
        
        app.post('/booking', async (req, res) => {
          const booking = req.body;
          const query = { treatmentName: booking.treatmentName, date: booking.date, patient: booking.patient }
          const exists = await bookingCollection.findOne(query);
          if (exists) {
            return res.send({ success: false, booking: exists })
          }
          const result = await bookingCollection.insertOne(booking);
          return res.send({ success: true, result });
        })

    }
    finally{

    }

}

run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Doctors Portal is Running!')
})

app.listen(port, () => {
  console.log(`Doctors app listening on port ${port}`)
})