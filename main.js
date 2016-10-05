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

if (Meteor.isClient)
{
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
		}
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
		'submit form' : function(event)
		{
			var userId = Meteor.userId();
			event.preventDefault();
			//gather user data to add to the database
			var unit = $('[name="unit"]').val();
			var standard = $('[name="standard"]').val();
			var date = $('[name="dateText"]').val();
			console.log(date);
			console.log(typeof(date));
			var user = Meteor.user();
			var userFirstName = user.profile.firstName;
			var userLastName = user.profile.lastName;

			//schedule a retake and add it to the database
			Retakes.insert({
				createdBy : userId,
				firstName : userFirstName,
				lastName : userLastName,
				unit : unit,
				standard : standard,
				date : date,
			});

			$('#orderForm')[0].reset();
			Router.go('home');
		}
	});

	Template.listOfRetakes.helpers({
		'scheduledRetakes' : function()
		{
			var currentUserId = Meteor.userId();
			return Retakes.find({createdBy : currentUserId}, {sort: {unit : 1, standard : 1}});
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
				Retakes.remove({_id : selectedRetake});
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
	})
}

if (Meteor.isServer)
{
	Meteor.startup(function(){
		if (Meteor.roles.find().count() == 0)
		{
			Roles.createRole("student");
			console.log("student role created");
			Roles.createRole("teacher");
			console.log("teacher role created");
		}
	});

	Meteor.publish(null, function (){
	  return Meteor.roles.find({})
	});

	/*
	//is called whenever a new user is created. it returns the new user object, or throws an error to abort the creation
	var id = Accounts.onCreateUser(function(options, user){
		//copy the profile from the options passed as an argument
		user.profile = options.profile;
		user.profile.firstName = options.profile.firstName;
		user.profile.lastName = options.profile.lastName;
		return user;
	});
	*/
}