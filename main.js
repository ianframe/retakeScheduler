import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
//import { Accounts } from 'meteor/accounts-base';

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
Router.route('/scheduleARetake', {
	template: 'scheduleARetake',
	name: 'scheduleARetake'
});

if (Meteor.isClient)
{
	Template.main.events({
		'click .logout' : function(event)
		{
			event.preventDefault();
			Meteor.logout();
			Router.go('home');
		}
	})

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
				else
					Router.go('/');
			});
			Router.go('home');
		}
	})

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
			var date = $('[name="date"]').val();
			var time = $('[name="time"]').val();
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
				time : time
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
				Retakes.remove({_id : selectedRetake});
		}
	});
}

if (Meteor.isServer)
{

}

