const utilities = require("./utilities.js");

const Message = function(message, sender_id, sender_name, recipient_id, recipient_name ,type_message, message_id){
	this.sender_id = sender_id;
	this.recipient_id = recipient_id;
	this.sender_name = sender_name;
	this.recipient_name = recipient_name;
	this.message = message;
	this.creation_date = utilities.get_date_and_time(); 
	this.type_message = type_message;
	this.message_id = message_id;
}

const compare_message = function(message1, message2){
	return message2.message_id - message1.message_id
}

//------------------------------------------------------------------------------------------------

module.exports = {
    Message : Message,
    compare_message : compare_message
}