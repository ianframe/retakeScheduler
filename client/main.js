import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Accounts } from 'meteor/accounts-base';

import './main.html';

if (Meteor.isClient)
{
	Meteor.subscribe('theRetakes');

	Template.orderForm.events(
	{
		'submit form' : function(event)
		{
			event.preventDefault(); //stop the page from submitting and refreshing
			var currentUserId = Meteor.userId();
			var studentName = event.target.firstName.value + " " + event.target.lastName.value;
			Retakes.insert({
				scheduledBy : currentUserId,
				name: studentName,
				unit: event.target.unit.value,
				standard: event.target.standard.value
			});
			document.getElementById("orderForm").reset();
		}
	});

	Template.listOfRetakes.helpers(
	{
		'scheduledRetake' : function()
		{
			var currentUserId = Meteor.userId();
			if (currentUserId != null)
				return Retakes.find({}, {sort: {unit: 1, standard: 1, name: -1} });
		},

		'selectedClass' : function()
		{
			var retakeId = this._id;
			var selectedRetake = Session.get('selectedRetake');
			if (retakeId == selectedRetake)
				return "selected";
		},
		'hasScheduledRetakes' : function()
		{
			var currentUserId = Meteor.userId();
			if (Retakes.find({scheduledBy : currentUserId}).count() != 0)
				return true;
			else
				return false;
		}
	});

	Template.listOfRetakes.events(
	{
		'click .scheduledRetake' : function()
		{
			var retakeId = this._id;
			Session.set('selectedRetake', retakeId);
		},
		'click .cancelButton' : function()
		{
			if (confirm("Are you sure you wish to cancel?"))
			{
				var selectedRetake = Session.get('selectedRetake');;
				Retakes.remove(selectedRetake);
			}
		}
	});
}
