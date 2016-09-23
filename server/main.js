import { Meteor } from 'meteor/meteor';

Meteor.startup(() => 
{
	Retakes = new Mongo.Collection('retakesCollection');
});
