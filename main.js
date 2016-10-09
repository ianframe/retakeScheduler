import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Accounts } from 'meteor/accounts-base';

Retakes = new Mongo.Collection('retakes');

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

Meteor.methods({
		'insertRetake' : function(userFirstName, userLastName, unit, standard, date)
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
				unit : unit,
				standard : standard,
				date : date,
			});
		},

		'removeRetake' : function(selectedRetake)
		{
			var currentUserId = this.userId;
			if (Roles.userIsInRole(this.userId, 'admin'))
				Retakes.remove({_id : selectedRetake});
			else
				Retakes.remove({_id : selectedRetake, createdBy : currentUserId});
		}
});

if (Meteor.isClient)
{
	Meteor.subscribe('theRetakes');

	$.validator.setDefaults({
		rules : {
			password :
			{
				required : true,
				minlength : 6
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
			email : 
			{
				required : "You must provide an email address.",
				email : "You must provide a valid email address."
			}

		}
	});

	Template.adminHome.events({
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
		'listOfAllRetakes' : function()
		{
			return Retakes.find({}, {sort : {unit : 1, standard : 1}});
		},
		'hasScheduledRetakes' : function()
		{
			return (Retakes.find({}).count() != 0);
		},
		'selectedRetake' : function()
		{
			var retakeId = this._id;
			var selectedRetake = Session.get('selectedRetake');
			if (retakeId == selectedRetake)
				return "selected";
		},
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
		}
	});

	Template.listOfRetakes.helpers({
		'scheduledRetakes' : function()
		{
			var currentUserId = Meteor.userId();
			return Retakes.find({createdBy : currentUserId}, {sort: {date : 1, standard : 1}});
		},
		'hasScheduledRetakes' : function()
		{
			var currentUserId = Meteor.userId();
			if (Retakes.find({createdBy : currentUserId}).count() != 0)
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
			let numOfRetakes = Retakes.find().count();
			if (numOfRetakes == 1)
				return "There is 1 retake scheduled.";
			else
				return "There are " + numOfRetakes + " retakes scheduled.";
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
			let email = $('[name="email"]').val();
			Accounts.forgotPassword({email : email});
			alert("This feature is still in development. :) Talk to Frame about resetting your account.");
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
						if (userEmail == "ian.frame@hies.org")
							Router.go('adminHome');
						else
							Router.go('home');
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
		},
	});

	Template.register.events({
		'submit form' : function(event)
		{
			event.preventDefault();
		}
	});

	Template.register.onRendered(function(){
		var validator = $('.register').validate({
			submitHandler : function(event)
			{
				var firstName = $('[name="firstName"]').val();
				var lastName = $('[name="lastName"]').val();
				var email = $('[name="email"]').val();
				var password = $('[name="password"]').val();
				Accounts.createUser({
					email : email, 
					password : password,
					profile : {
						firstName : firstName,
						lastName : lastName
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
						if (email == "ian.frame@hies.org")
							Router.go('/adminHome');
						else
							Router.go('home');
					}
				});
			}
		});
	});

	Template.scheduleARetake.events({
		'change #unit' : function(event){
			$(document).ready(function(){
				var unitChangedTo = $('[name="unit"]').val();
				if (unitChangedTo == "u2")
					$('#standard').html("<option value='2A'>A - Class Construction with Fields and Constructors</option><option value='2B'>B - Accessor and Mutator Methods</option><option value='2C'>C - Variable Assignment Operators</option><option value='2D'>D - Java Math</option><option value='2E'>E - String Methods</option><option value='2F'>F - Conditionals</option><option value='2G'>G - Working with APIs</option><option value='2H'>H - Logical Operators and Boolean Expressions</option>");
				else if (unitChangedTo == "u1")
					$('#standard').html("<option value='1A'>A - Classes and Objects</option><option value='1B'>B - Data Types</option><option value='1C'>C - Object Dot Notation</option><option value='1D'>D - Appropriate Fields and Methods for a Class</option><option value='1E'>E - Object Diagrams and Object State</option>");
				else if (unitChangedTo == "u0")
					$('#standard').html("<option value='0b'>B - Binary Number System</option><option value='0C'>C - Signed Quiz Policy</option>")
			});
		},

		'submit form' : function(event)
		{
			event.preventDefault();
			//gather user data to add to the database
			var unit = $('[name="unit"]').val();
			var standard = $('[name="standard"]').val();
			var date = $('[name="dateText"]').val();
			var user = Meteor.user();
			var userFirstName = user.profile.firstName;
			var userLastName = user.profile.lastName;
			//pass client-side data and pass it into the server-side insertion
			Meteor.call('insertRetake', userFirstName, userLastName, unit, standard, date);
			$('#orderForm')[0].reset();
			Router.go('home');
		}
	});
}

if (Meteor.isServer)
{
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

	Accounts.onCreateUser(function(options, user){
		user.profile = options.profile;
		if (user.emails[0].address == "ian.frame@hies.org")
			user.roles = ['student', 'admin'];
		else
			user.roles = ['student'];
	  return user;
	});

	Email.send({
	  from: "ianframe3@gmail.com"
	});
}