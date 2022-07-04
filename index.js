const express = require('express'); //Sets up express framework to streamline node.js code handling
const mongoose = require('mongoose'); // Sets up mongoose to streamline Mongodb code handling
const bodyParser = require('body-parser'); //used to assist in JSON parsing
const ejs = require('ejs');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static('public'));
app.set('view engine', 'ejs');

/////////////////Boiler plate code


mongoose.connect("mongodb://localhost:27017/payrollDB", {
  useNewUrlParser: true
}); //Connects to the mongod database and sets up the payrollDB

const EmployeeSchema = new mongoose.Schema({ //Establishes the Schema all employee documents will be using
  name: String,
  current: Boolean,
  hourlyPay: Number,
  weeklyHours: Number,
  rawWage: Number,
  netWage: Number,
  taxes: Number,
});

const Employee = mongoose.model("Employee", EmployeeSchema); // Creates the Employee collection

const ScheduleSchema = new mongoose.Schema({ //Establishes the Schema all schedule documents will be using
  name: String,
  day: String,
  weeklyHours: Number,
  time: String
});

const Schedule = mongoose.model("Schedule", ScheduleSchema); // Creates the schedule collection

// Constants that will be used in most routes
const tax = 0.10;
let current = true;

let workers = [''];

let scheduleLog = [''];

//Beginning of the routes

app.get("/", function(req, res) {
  res.render("index")
});

app.post("/", function(req, res, err) { // Catches the form data from the home page in req.body

  if (req.body.current == 'on') { //Checks the state of the checkbox for the input that regulates current employement
    current = true; //if checkbox is checked the then current is true
  } else {
    current = false;
  }
  const employee = new Employee({ //A single instance of the employee document
    name: req.body.name,
    current: current,
    weeklyHours: req.body.weeklyHours,
    hourlyPay: req.body.hourlyPay,
    rawWage: req.body.hourlyPay * req.body.weeklyHours,
    netWage: ((req.body.hourlyPay * req.body.weeklyHours) - ((req.body.hourlyPay * req.body.weeklyHours) * tax)),
    taxes: ((req.body.hourlyPay * req.body.weeklyHours) * tax)
  });

  Employee.find(function(err, employees) { //The employee collection is filtered through to update the workers variable
    if (err) {
      console.log(err)
      res.redirect('/')
    } else {
      return workers = employees; //returns the workers variable that feeds information to the get requests after the redirect is called
    }
  }).lean()

  employee.save(); // saves the employee information into the employee collection
  res.redirect("/");
})



app.get("/find", function(req, res) { //calls for the find route
  res.render("find.ejs", { //renders the find page with information from the workers variable
    employees: workers
  })
})

app.post("/find", function(req, res) { //handles all post requests to the find route
  if (req.body.findByID === "" || null) { //prevents app crash by first checking the values passed
    Employee.find(function(err, employees) {
      if (err) { // if err is found its logged in the console and the page is refreshed
        console.log(err)
        res.redirect('/find')
      } else { // else the workers variable is updated for the find route get request render
        res.redirect('/find')
        return workers = employees;
      }
    }).lean() //.lean() stops mongoose from converting the database objects into its specialized objects
  } else {
    Employee.findById(req.body.findByID, function(err, employee) {
      if (err) { // another check to assure that the values passed are indeed valid
        console.log(err)
        res.redirect('/find')
      } else {
        function current (){ //a function to check the state of the current checkbox field
          if(employee.current){
            return `<td><input type="checkbox" checked id="current" name="current"></td>`
          }else{
            return `<td><input type="checkbox" id="current" name="current"></td>`
          }
        }
        res.send(`
          <form class="nav-form" action="/find" method="get">
            <button type="submit" name="Find">Find Employee</button>
          </form>
          <form class="nav-form" action="/update" method="post">
          <table>
          <tr>
            <th>ID</th>
            <th>name</th>
            <th>current</th>
            <th>Hourly Pay</th>
            <th>Weekly Hours</th>
            <th>Raw Wage</th>
            <th>Net Wage</th>
            <th>Tax</th>
          </tr>
          <tr>
            <td><input type="text" id="id" name="id" readonly value= "${employee._id}"></td>
            <td><input type="text" id="name" name="name" value= "${employee.name}"></td>
            ${current()}
            <td><input type="checkbox" id="current" name="current"></td>
            <td><input type="text" id="hourlyPay" name="hourlyPay" value="${employee.hourlyPay}"></td>
            <td><input type="text" id="weeklyHours" name="weeklyHours" value="${employee.weeklyHours}"></td>
            <td>${employee.rawWage}</td>
            <td>${employee.netWage}</td>
            <td>${employee.tax}</td>
          </tr>
        </table>
          <button type="submit" name="Update">Update Employee</button>
        </form>
        `) //Creates another window for the user to see the weekly information for a single employee
      }
    })
  }
})

app.post("/update", function(req, res) { //The route used to update the employee information as needed
    function current(){ // The function used to check the current checkbox field
      if(req.body.current){
        return true
      }else{
        return false
      }
    }
  Employee.updateOne({ // assembles the known information from the client, along with the changes, and updates the specified employee
      _id: String(req.body.id)
    }, {
      name: req.body.name,
      weeklyHours: req.body.weeklyHours,
      hourlyPay: req.body.hourlyPay,
      current: current(),
      rawWage: req.body.weeklyHours * req.body.hourlyPay,
      tax: ((req.body.weeklyHours * req.body.hourlyPay) * tax),
      netWage: ((req.body.weeklyHours * req.body.hourlyPay) - ((req.body.weeklyHours * req.body.hourlyPay) * tax))
    },
    function(err) { //checks for errors in the process of updating and refreshes the page after it is logged to the console
      if (err) {
        console.log(err);
        res.redirect("/find");
      } else {
        Employee.find(function(err, employees) { //updates the workers variable for the next get request when the next redirect is called
          if (err) {
            console.log(err)
          } else {
            return workers = employees;
          }
        }).lean()
        res.redirect("/find")
      }
    })
})

app.get('/delete', function(req, res) { //the route for employee deletions
  res.render('delete');
})

app.post("/delete", function(req, res) { //handles the post request for deletions
  Employee.deleteOne({
    _id: req.body.delete
  }, function(err) { // handles any error that comes through by logging the error and redirecting back to the finding route
    if (err) {
      console.log(err);
      res.redirect("/find")
    } else {
      Employee.find(function(err, employees) { //updates the workers variable to have the latests data once the redirect is called
        if (err) {
          console.log(err)
          res.redirect("/find");
        } else {
          return workers = employees;
        }
      }).lean()
      res.redirect("/find")
    }
  })
})

app.get('/schedule', function(req, res){ //the route for the employee schedule
  Schedule.find(function(err, workSchedule){
      scheduleLog = workSchedule;
      res.render('schedule', {log: scheduleLog})
  })
})



app.post('/schedule', function(req, res){ //handles the requests to update the schedule with new information
  if(req.body.schedule === ''){
    return res.redirect("/schedule");
  }
  Employee.find({_id: req.body.schedule}, function(err, employee) { //Uses information from the employee collection to fill out the schedule collection
    if (err) {
      console.log(err)
      res.redirect('/schedule')
    } else {
      const schedule = new Schedule({ //a single instance of the schedule document
        name: employee[0].name,
        day: req.body.day,
        weeklyHours: employee[0].weeklyHours,
        time: req.body.time
        })
      schedule.save();
    }
  }).lean()

  Schedule.find({}, function(workSchedule){ //updates the scheduleLog variable to pass information to the get request render
      return scheduleLog = workSchedule;
  })
  res.redirect('/schedule')
})

app.post('/delSchedule', function(req, res){ //handles the deletion of the schedule documents
  Schedule.deleteOne({_id: req.body.Id}, function(err, employee) {
    if (err) {
      console.log(err)
      res.redirect('/schedule')
    } else {
      Schedule.find({}, function(workSchedule){
          res.redirect('/schedule')
          return scheduleLog = workSchedule;
      })
    }
  }).lean()
})

//Initiation of Express server

const PORT = process.env.PORT || 3000;

app.listen(PORT, function() {
  console.log('Server running successfully')
});
