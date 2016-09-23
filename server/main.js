import { Meteor } from 'meteor/meteor';

Meteor.startup(() => 
{
});

Meteor.publish('theRetakes', function(){
	var currentUserId = this.userId;
	return Retakes.find({scheduledBy : currentUserId});
});

Meteor.methods(
{
	'insertRetake' : function(studentName, unit, standard)
	{
		var currentUserId = this.userId;
		Retakes.insert({
			scheduledBy : currentUserId,
			name: studentName,
			unit: unit,
			standard: standard
		});
	},
	'removeRetake' : function(selectedStandard)
	{
		var currentUserId = this.userId
		Retakes.remove({_id : selectedStandard, scheduledBy : currentUserId});
	}
});