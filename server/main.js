import { Meteor } from 'meteor/meteor';

Meteor.startup(() => 
{
});

Meteor.publish('theRetakes', function(){
	var currentUserId = this.userId;
	return Retakes.find({scheduledBy : currentUserId});
});
