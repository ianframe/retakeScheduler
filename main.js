import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Accounts } from 'meteor/accounts-base';

Retakes = new Mongo.Collection('retakes');

Router.configure({
	layoutTemplate : 'main'
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
	name : 'adminHome'
});
Router.route('/scheduleARetake', {
	template: 'scheduleARetake',
	name: 'scheduleARetake'
});

Roles.deleteRole('student');

Meteor.methods({
		'insertRetake' : function(userFirstName, userLastName, unit, standard, date)
		{
			var currentUserId = this.userId;
			//schedule a retake and add it to the database
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
			Retakes.remove({_id : selectedRetake, createdBy : currentUserId});
		},
});

if (Meteor.isClient)
{

	Meteor.subscribe('theRetakes');

	Template.main.events({
		'click .logout' : function(event)
		{
			event.preventDefault();
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
					console.log(error.reason);
			});
			if (email == "ian.frame@hies.org")
				Router.go('/adminHome');
			else
				Router.go('home');
		}
	});

	Template.login.events({
		'submit form' : function(event)
		{
			event.preventDefault();
			var userEmail = $('[name="email"]').val();
			var userPassword = $('[name="password"]').val();
			Meteor.loginWithPassword(userEmail, userPassword, function(error)
			{
				if(!error)
				{
					if (userEmail == "ian.frame@hies.org")
						Router.go('adminHome');
					else
						Router.go('home');
				}
			});
		}
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
		}
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
			Retakes.remove({_id: retakeId});
		}
	});
}

if (Meteor.isServer)
{
	Meteor.publish('theRetakes', function(){
		let currentUserId = this.userId;
		//check if ian is logged in
		let framedog = Meteor.users.findOne({"emails.0.address" : "ian.frame@hies.org"});
		if (framedog && framedog._id == currentUserId)
			return Retakes.find({});
		else
			return Retakes.find({createdBy : currentUserId});
	});


	Accounts.onCreateUser(function(options, user){
		user.profile = options.profile;
		if (user.emails[0].address == "ian.frame@hies.org")
			user.roles = ['student', 'admin'];
		else
			user.roles = ['student'];
	  return user;
	});
}