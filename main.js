import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Accounts } from 'meteor/accounts-base';

Retakes = new Mongo.Collection('retakes');
SampleQuizzes = new Mongo.Collection('sampleQuizzes');

Router.configure({
	layoutTemplate : 'main',
	loadingTemplate: 'loading'
});
Router.route('/register',{
	template : 'register',
	name: 'register'
});
Router.route('/login',{
	template: 'login',
	name: 'login'
});
Router.route('/', {
	template : 'home',
	name: 'home'
});

Router.route('/sampleQuizzes',{
	template: 'sampleQuizzes',
	name: 'sampleQuizzes'
});

Router.route('/adminCredits',{
	template : 'adminCredits',
	name: 'adminCredits',

	onBeforeAction : function()
	{
		let currentUserId = Meteor.userId();
		if (Roles.userIsInRole(currentUserId, 'admin'))
			this.render('adminCredits');
		else
		{
			this.render('home');
		}
	}
});

Router.route('/adminHome',{
	template : 'adminHome',
	name : 'adminHome',

	onBeforeAction : function()
	{
		let currentUserId = Meteor.userId();
		if (Roles.userIsInRole(currentUserId, 'admin'))
			this.render('adminHome');
		else
		{
			this.render('home');
		}
	}
});

Router.route('/scheduleARetake', {
	template: 'scheduleARetake',
	name: 'scheduleARetake'
	
});

Router.route('/listOfRetakeRequests',{
	template: 'listOfRetakeRequests',
	name: 'listOfRetakeRequests',

	onBeforeAction : function()
	{
		let currentUserId = Meteor.userId();
		if (Roles.userIsInRole(currentUserId, 'admin'))
			this.render('listOfRetakeRequests');
		else
		{
			this.render('home');
		}
	}
});

Meteor.methods({
	'insertRetake' : function(userFirstName, userLastName, teacher, subject, unit, standard, date, todayDate, time)
	{
		var currentUserId = this.userId;
		//schedule a retake and add it to the database
		if (!Meteor.userId())
		{
			throw new Meteor.Error("not-logged-in", "You must login before scheduling a retake.");
		}
		check(userFirstName, String);
		check(userLastName, String);
		check(unit, String);
		check(standard, String);
		check(date, String);

		Retakes.insert({
			createdBy : currentUserId,
			firstName : userFirstName,
			lastName : userLastName,
			teacher : teacher,
			subject : subject,
			unit : unit,
			standard : standard,
			date : date,
			time: time,
			dateCreated : todayDate
		});
	},

	'removeRetake' : function(selectedRetake)
	{
		var currentUserId = this.userId;
		if (Roles.userIsInRole(this.userId, 'admin'))
			Retakes.remove({_id : selectedRetake});
		else
			Retakes.remove({_id : selectedRetake, createdBy : currentUserId});
	},

	'rescheduleRetake' : function(retakeId, retakeCreator, newDate, newTime)
	{
		if (retakeCreator == Meteor.userId())
		{
			Retakes.update({_id : retakeId}, {$set : {date : newDate, time: newTime}});
		}
	},

	'giveCreditToStudent' : function(student)
	{
		Meteor.users.update({_id: student}, {$inc: {"profile.credits" : 1}});
	},

	'subCreditFromStudent' : function(student)
	{
		Meteor.users.update({_id: student}, {$inc: {"profile.credits" : -1}});
	},

	'under2QuizLimit' : function()
	{
		return true;
	}
});

if (Meteor.isClient)
{
	$.validator.setDefaults({
		rules : {
			password :
			{
				required : true,
				minlength : 6
			},
			confirmPassword :
			{
				required : true,
				minlength : 6,
				equalTo : "#password"
			},
			email :
			{
				required : true,
				email : true
			}
		},
		messages : {
			password : 
			{
				required : "You must provide a password.",
				minlength : "Your password must contain at least 6 characters."
			},
			confirmPassword :
			{
				required : "Please confirm your password.",
				equalTo : "Passwords must match."
			},
			email : 
			{
				required : "You must provide an email address.",
				email : "You must provide a valid email address."
			}

		}
	});

	Template.adminCredits.events({
		'click tr' : function()
		{
			Session.set('selectedStudent', this._id);
		},

		'click #addCredit' : function()
		{
			let student = Session.get('selectedStudent');
			Meteor.call('giveCreditToStudent', student);
		},

		'click #subCredit' : function()
		{
			let student = Session.get('selectedStudent');
			Meteor.call('subCreditFromStudent', student);
		}
	})

	Template.adminCredits.helpers({
		'getListOfStudents' : function()
		{
			let currentTeacher = Meteor.user().profile.teacher;
			//return Meteor.users.find({"profile.teacher" : currentTeacher}, {sort : {"profile.lastName" : 1}});
			return Meteor.users.find({},{sort : {"profile.lastName" : 1}});
		},

		'selectedStudent' : function()
		{
			let currentStudent = this._id;
			let sessionStudent = Session.get('selectedStudent');
			if (currentStudent == sessionStudent)
				return "selected"
		}
	});

	Template.adminCredits.onCreated(function() {
		Meteor.subscribe('theUsers');
	})

	Template.adminHome.onCreated(function() {
		Meteor.subscribe('theRetakes');
	});

	Template.adminHome.events({
		'click .sortLink' : function()
		{
			let sortPreference = event.target.id;
			if (sortPreference == "sortByStandard")
				Session.set('selectedSort', 'standard');
			else 
				Session.set('selectedSort', 'date');
		},
		'click .scheduledRetake' : function()
		{
			var retakeId = this._id;
			Session.set('selectedRetake', retakeId);
		},
		'click #adminRemoveRetake' : function()
		{
			var retakeId = Session.get('selectedRetake');
			Meteor.call('removeRetake', retakeId);
		}
	});

	Template.adminHome.helpers({
		'hasScheduledRetakes' : function()
		{
			let currentUser = Meteor.user();
			let currentTeacher = currentUser.profile.teacher;
			return (Retakes.find({teacher : currentTeacher}).count() != 0);
		},
		'selectedRetake' : function()
		{
			var retakeId = this._id;
			var selectedRetake = Session.get('selectedRetake');
			if (retakeId == selectedRetake)
				return "selected";
		},
		'listOfAllScheduledRetakes' : function()
		{
			let currentUser = Meteor.user();
			let currentTeacher = currentUser.profile.teacher;
			let sortPreference = Session.get('selectedSort');
			if (sortPreference == 'standard')
				return Retakes.find({}, {sort : {standard : 1}});
			else
				return Retakes.find({}, {sort : {date : 1}});
		}
	});

	Template.infoForRetakes.helpers({

		'getNumberOfCredits' : function()
		{
			let currentUser = Meteor.user();
			return currentUser.profile.credits;
		}
	})

	Template.listOfRetakes.onCreated(function() {
		Meteor.subscribe('theRetakes');
	});


	Template.listOfRetakes.events({
		'click .scheduledRetake' : function()
		{
			var retakeId = this._id;
			Session.set('selectedRetake', retakeId);
		},
		'click .cancelRetake' : function()
		{
			var selectedRetake = Session.get('selectedRetake');
			if(confirm("Are you sure you want to cancel this retake?"))
			{
				Meteor.call('removeRetake', selectedRetake);
			}
			else
				Session.set('selectedRetake', null);
		},
		'click .modifyRetake' : function()
		{
			if (Session.get('selectedRetake') != null)
			{
				Session.set('isUserRescheduling', true);
			}
			else
			{
				Bert.alert("You must select a retake to modify first.", 'info', 'fixed-bottom');
			}
				
		}
	});

	Template.listOfRetakes.helpers({
		'getscheduledRetakes' : function()
		{
			var currentUserId = Meteor.userId();
			var studentsTeacher = Meteor.user().profile.teacher; 
			return Retakes.find({createdBy : currentUserId, teacher : studentsTeacher}, {sort: {date : 1, standard : 1}});
		},
		'getscheduledRequestedRetakes' : function()
		{
			var currentUserId = Meteor.userId();
			var studentsTeacher = Meteor.user().profile.teacher;
			return Retakes.find({createdBy : currentUserId, teacher : studentsTeacher}, {sort: {date : 1, standard : 1}});
		},
		'hasScheduledRetakes' : function()
		{
			var studentsTeacher = Meteor.user().profile.teacher;
			if (Retakes.find({teacher : studentsTeacher}).count() != 0)
				return true;
			else
				return false;
		},
		'hasRequestedRetakes' : function()
		{
			var currentUserId = Meteor.userId();
			if (Retakes.find({createdBy : currentUserId, status : 'requested'}).count() != 0)
				return true;
			else
				return false;
		},
		'selectedRetake' : function()
		{
			var retakeId = this._id;
			var selectedRetake = Session.get('selectedRetake');
			if (retakeId == selectedRetake)
				return "selected";
		},
		'numOfRetakes' : function()
		{
			return Retakes.find().count();
		},
		'numberOfRetakesStatement' : function()
		{
			let currentTeacher = Meteor.user().profile.teacher;
			let message = "";
			let numOfApprovedRetakes = Retakes.find({teacher : currentTeacher}).count();
			if (numOfApprovedRetakes == 1)
				message = "There is 1 retake scheduled. ";
			else
				message = "There are " + numOfApprovedRetakes + " retakes scheduled.";

			return message;
		}
	});

	Template.login.events({
		'submit form' : function(event)
		{
			event.preventDefault();
		},
		'click #forgotPasswordButton' : function(event)
		{
			event.preventDefault();
			alert("Feature is still in development. Talk to Frame about resetting your password.");

		}
	});
		
	//when the template is inserted into the DOM
	Template.login.onRendered(function(){
		var validator = $('.login').validate({
			submitHandler : function(event)
			{
				var userEmail = $('[name="email"]').val();
				var userPassword = $('[name="password"]').val();
				Meteor.loginWithPassword(userEmail, userPassword, function(error)
				{
					if (error)
					{
						if (error.reason == "User not found")
						{
							validator.showErrors({
								email : "This is not a registered email address."
							});
						}
						else if (error.reason == "Incorrect password")
						{
							validator.showErrors({
								password : "That is not the correct password."
							});
						}
					}

					else
					{
						if (userEmail == "ian.frame@hies.org"){
							Router.go('adminHome');
							Bert.alert('Login success!', 'success', 'growl-top-right');
						}
							
						else{
							Router.go('home');
							Bert.alert('Login success!', 'success', 'growl-top-right');
						}
					}
				});
			}
		});
	});


	Template.main.events({
		'click .logout' : function(event)
		{
			event.preventDefault();
			Meteor.logout();
			Router.go('home');
		}
	});

	Template.nav.events({
		'click #logoutButton' : function()
		{
			Meteor.logout();
			Router.go('home');
		}
	});

	Template.navigation.helpers({
		'getFirstName' : function()
		{
			var currentUserId = Meteor.userId();
			if (currentUserId)
				return Meteor.users.find({_id : currentUserId}).fetch()[0].profile.firstName;
		}
	});

	Template.register.events({
		'submit form' : function(event)
		{
			event.preventDefault();
		},
		'click #testButton' : function(event)
		{
			event.preventDefault();
			console.log($('[name="course"]').val());
		}
	});

	Template.register.onRendered(function(){
		var validator = $('.register').validate({
			submitHandler : function(event)
			{
				var firstName = $('[name="firstName"]').val();
				var lastName = $('[name="lastName"]').val();
				var teacher = $('[name="teacher"]').val();
				var email = $('[name="email"]').val();
				var password = $('[name="password"]').val();
				var confirmPassword = $('[name="confirmPassword"]').val();
				var user = Accounts.createUser({
					email : email, 
					password : password,
					profile : {
						firstName : firstName,
						lastName : lastName,
						teacher : teacher,
						credits : 0
					}
				}, function(error){
					if (error)
					{
						if (error.reason == "Email already exists.")
						{
							validator.showErrors({
								email : "An account for that email address has already been created"
							});
						}
					}
					else
					{
						if (email == "ian.frame@hies.org"){
							Router.go('/adminHome');
							Bert.alert('Successful registration!', 'success', 'growl-top-right');
						}
							
						else{
							Router.go('home');
							Bert.alert('Successful registration!', 'success', 'growl-top-right');
						}
					}
				});
			}
		});
	});

	Template.rescheduleARetake.events({
		'click #cancelReschedule' : function(event)
		{
			event.preventDefault();
			Session.set('isUserRescheduling', false);
			Session.set('selectedRetake', null);
		},

		'click #submitReschedule' : function(event)
		{
			event.preventDefault();
			var retakeId = Session.get('selectedRetake');
			var retakeCreator = Retakes.findOne({_id : retakeId}).createdBy;
			var newDate = $('[name="rescheduleFiveDayDate"]').val();
			var newTime = $('[name="rescheduleTime"]').val();
			Meteor.call('rescheduleRetake', retakeId, retakeCreator, newDate, newTime);
			Session.set('isUserRescheduling', false);
			Session.set('selectedRetake', null);
		}
	})

	Template.rescheduleARetake.helpers({
		'doesUserWishToReschedule' : function()
		{
			return Session.get('isUserRescheduling');
		}
	});

	Template.scheduleARetake.events({
		'change #subject' : function(event){
			$(document).ready(function(){
				var subjectChangedTo = $('[name="subject"]').val();
				console.log(subjectChangedTo);
				if (subjectChangedTo == "AP CS")
				{
					$('#unit').html("<select class='form-control' name='unit' id='unit'><option disabled selected>Select a Unit</option><option value='u9'>Unit 9 - Algorithms</option><option value='u8'>Unit 8 - Inheritance</option><option value='u5'>Unit 5 - Two-Dimensional Arrays</option><option value='u4'>Unit 4 - Collections and Looping</option><option value='u2'>Unit 2 - Class Definitions</option><option value='u1'>Unit 1 - Introduction to Object-Oriented Programming</option><option value='u0'>Unit 0 - Introduction to Computing</option></select> ");
				}
				else if (subjectChangedTo == "AP Calculus B/C")
				{
					$('#unit').html("<select class='form-control' name='unit' id='unit'><option disabled selected>Select a Unit</option><option value='u1'>Unit 1 - Limits</option><option value='u2'>Unit 2 - Derivatives</option><option value='u3'>Unit 3 - Derivative Applications</option><option value-'u4'>Unit 4 - Integration</option><option value='u5'>Unit 5 - Transcendentals</option><option value='u6'>Unit 6 - Integral Applications</option><option value='u7'>Unit 7 - Differential Equations</option><option value='u8'>Unit 8 - Sequences & Series</option><option value='u9'>Unit 9 - Taylor Polynomials</option><option value='u10'>Unit 10 - Vector, Parametric, & Polar Calculus</option></select>");
				}
				else if (subjectChangedTo == "AP Physics 1")
				{
					$('#unit').html("<select class='form-control' name='unit' id='unit'><option disabled selected>Select a Unit</option><option value='u1'>Unit 1 - Kinematics</option></select>");
				}
				$('#standard').html("<select class='form-control' name='standard' id='standard'><option value='' disabled selected>Select a Standard</option></select>");
			});	
		},

		'change #unit' : function(event){
			$(document).ready(function(){
				var subjectChangedTo = $('[name=subject]').val();
				if (subjectChangedTo == "AP CS")
				{
					var unitChangedTo = $('[name="unit"]').val();
					if (unitChangedTo == "u9")
						$('#standard').html("<option value='9A'>A - Recursion</option><option value='9B'>B - Searching Algorithms</option><option value='9C'>C - Sorting Algorithms</option>");
					else if (unitChangedTo == "u8")
						$('#standard').html("<option value='8A'>A - Inheritance Hierarchies and the Is-A Relationship</option><option value='8B'>B - Implementing a Subclass</option><option value='8C'>C - Overriding and Super Methods</option><option value='8D'>D - Polymorphism</option><option value='8E'>E - Abstract Classes</option>");
					else if (unitChangedTo == "u5")
						$('#standard').html("<option value='5A'>A - Understanding 2D Arrays</option><option value='5B'>B - Declaring, Instantiating, Accessing, and Assigning 2D Arrays</option><option value='5C'>C - Common 2D Array Algorithms</option>");
					else if (unitChangedTo == "u4")
						$('#standard').html("<option value='4A'>A - Creating and Populating Arrays</option><option value='4C'>C - Working with For and While Loops</option><option value='4E'>E - Searching Methods with Arrays of Objects</option><option value='4G'>G - Common Array Algorithms</option>");
					else if (unitChangedTo == "u2")
						$('#standard').html("<option value='2A'>A - Class Construction with Fields and Constructors</option><option value='2B'>B - Accessor and Mutator Methods</option><option value='2C'>C - Conditionals</option><option value='2D'>D - Java Math</option><option value='2E'>E - String Methods</option>");
					else if (unitChangedTo == "u1")
						$('#standard').html("<option value='1A'>A - Classes and Objects</option><option value='1B'>B - Data Types</option><option value='1C'>C - Object Dot Notation</option><option value='1D'>D - Appropriate Fields and Methods for a Class</option><option value='1E'>E - Object Diagrams and Object State</option>");
					else if (unitChangedTo == "u0")
						$('#standard').html("<option value='0b'>B - Binary Number System</option><option value='0C'>C - Signed Quiz Policy</option>");
				}
				else if (subjectChangedTo == "AP Calculus B/C")
				{
					var unitChangedTo = $('[name="unit"]').val();
					if (unitChangedTo == "u1")
						$('#standard').html("<option value='1A'>A - Tabular & Graphical Limits</option><option value='1B'>B - Algebraic Limits</option><option value='1C'>C - Continuity</option><option value='1D'>D - Infinite Limits & Limits at Infinity</option><option value='1E'>E - Limit Notation</option>");
					else if (unitChangedTo == "u2")
						$('#standard').html("<option value='2A'>A - Tabular & Graphical Estimates of Derivatives</option><option value='2B'>B - Derivative Meaning in Word Problems</option><option value='2C'>C - Algebraic Derivatives</option><option value='2D'>D - Implicit Differentiation</option><option value='2E'>E - Related Rates</option>");
					else if (unitChangedTo == "u3")
						$('#standard').html("<option value='3A'>A - IVT, EVT, MVT & Rolle’s Theorems</option><option value='3B'>B - First Derivative Analysis</option><option value='3C'>C - Second Derivative Analysis</option><option value='3D'>D - Optimization</option><option value='3E'>E - Tangent Lines & Differentials</option>");
					else if (unitChangedTo == "u6")
						$('#standard').html("<option value='6A'>A - Determining Length, Area, and Volume of Shapes</option><option value='6B'>B - Integration by Parts</option><option value='6C'>C - Integrating Quotients</option><option value='6D'>D - Evaluating Indeterminate Limits</option><option value='6E'>E - Improper Integrals</option>");
					else if (unitChangedTo == "u7")
						$('#standard').html("<option value='7A'>A - General & Specific Solutions to Differential Equations</option><option value='7B'>B - Slope Fields</option><option value='7C'>C - Euler's Method</option><option value='7D'>D - Separation of Variables</option><option value='7E'>E - Logistic Growth</option>");
					else if (unitChangedTo == "u8")
						$('#standard').html("<option value='8A'>A - Evaluating Sequences for Convergence/Divergence</option><option value='8B'>B - Series Convergence/Divergence by Direct Inspection</option><option value='8C'>C - Series Convergence/Divergence by Comparison</option><option value='8D'>D - Evaulating and Bounding the Sum of a Series</option><option value='8E'>E - Alternating Series</option>");
					else if (unitChangedTo == "u9")
						$('#standard').html("<option value='9A'>A - Constructing and Using Taylor Polynomials</option><option value='9B'>B - Power Series for Function Representation</option><option value='9C'>C - Radius and Interval of Convergence of a Power Series</option><option value='9D'>D - Taylor's Theorem to Error Bound Polynomials</option><option value='9E'>E - Calculus on Power Series</option>");
					else if (unitChangedTo == "u10")
						$('#standard').html("<option value='10A'>A - Calculus with Vector-Defined Functions</option><option value='10B'>B - Calculus with Parametrically-Defined Functions</option><option value='10C'>C - Parametrically-Defined Motion Problems</option><option value='10D'>D - Calculus with Polar Equations</option><option value='10E'>E - Area Bounded by Polar Curves</option>");
				}
				else if (subjectChangedTo == "AP Physics 1")
				{
					var unitChangedTo = $('[name="unit"]').val();
					if (unitChangedTo == "u1")
						$('#standard').html("<option value='1A'>A - Graphical Representations of Motion</option><option value='1C'>C - Constant Acceleration</option><option value='1D'>D - Projectiles</option>");				
				}
			});
		},

		'click .resend-verification-link' : function(event)
		{
			event.preventDefault();
			alert("Feature is still in development. Talk to Frame about resetting your password.");
		},

		'click #gen5days' : function(event)
		{
			console.log($('[name="fiveDayDate"]').val());
		},

		'submit form' : function(event)
		{
			event.preventDefault();
			
			//gather user data to add to the database
			var subject = $('[name="subject"]').val();
			var unit = $('[name="unit"]').val();
			var standard = $('[name="standard"]').val();
			var date = $('[name="fiveDayDate"]').val();
			var time = $('[name="time"]').val();

			var user = Meteor.user();
			var userId = user._id;
			var userFirstName = user.profile.firstName;
			var userLastName = user.profile.lastName;
			var teacher = user.profile.teacher;
			var currentNumOfCredits = user.profile.credits;

			let today = String(new Date());
			let todayDate = today.substring(0, 15);

			if (!(todayDate == date)) //the student planned ahead. 
			{
				//check to see if they have enough credits.
				if (currentNumOfCredits > 0)
				{
					console.log(subject);
					Meteor.call('insertRetake', userFirstName, userLastName, teacher, subject, unit, standard, date, today, time);
					Meteor.call('subCreditFromStudent', userId);
					$('#orderForm')[0].reset();
					Router.go('home');
				}
				
			}
			else
			{
				Bert.alert('You cannot schedule a retake the day of. Frame needs time to print these quizzes. Try tomorrow.', 'danger', 'growl-top-right');
			}
		}
	});

	Template.scheduleARetake.helpers({

		'hasCredits' : function()
		{
			return (Meteor.user().profile.credits > 0);
		}
	});
}

if (Meteor.isServer)
{
	Meteor.startup(function()
	{
		var users = Meteor.users.find({});
		if (users)
		{
			users.forEach(function(student)
			{
				if (student.profile.credits == undefined)
					student.profile.credits = 0;
			})
		}
	});
	Meteor.publish('theUsers', function(){

		let currentUserId = this.userId;
		if (Roles.userIsInRole(this.userId, 'admin'))
		{
			let currentTeacher = Meteor.users.find({_id: currentUserId}).fetch()[0].profile.teacher;
			//let options = {fields : {"profile.firstName":1, "profile.lastName": 1, "profile.teacher":1, "profile.credits":1}};
			//return Meteor.users.find({"profile.teacher" : currentTeacher});
			return Meteor.users.find({});
		}
		this.stop();
		return;
	});

	Meteor.publish('theRetakes', function(){
		let currentUserId = this.userId;
		if (Roles.userIsInRole(this.userId, 'admin'))
			return Retakes.find({});
		else
			return Retakes.find({createdBy : currentUserId});
	});

	Meteor.users.allow({
		remove : function(userId , doc)
		{
			if(Roles.userIsInRole(userId,'admin'))
				return true;
			else
				return false;
		}
	});

	Meteor.users.deny({
		update: function() {
	    	return true;
	  	}
	});

	Retakes.allow({
		update : function(userId, doc)
		{
			if(Roles.userIsInRole(userId,'admin'))
				return true;
			else if (Roles.userIsInRole(userId, 'student') && userId == doc.createdBy)
			{
				return true;
			}
			else
				return false;
		}
	})

	Accounts.onCreateUser(function(options, user){
		user.profile = options.profile;
		if (user.emails[0].address == "ian.frame@hies.org")
			user.roles = ['student', 'admin'];
		else if (user.emails[0].address == "dan.forrestal@hies.org")
			user.roles = ['student', 'admin'];
		else if (user.emails[0].address == "john.taylor@hies.org")
			user.roles = ['student', 'admin'];
		else
			user.roles = ['student'];
	  return user;
	});
}