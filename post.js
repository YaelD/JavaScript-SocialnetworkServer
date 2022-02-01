const file_handling = require("./file_handling.js");
const utilities = require("./utilities")
//------------------------------------------------------------------------------------------------

const Post = function(message, sender_id, email, post_id){
	this.creator_id = sender_id;
	this.email = email;
	this.message = message;
	this.creation_date = utilities.get_date_and_time(); 
	this.post_id = post_id;
}
//------------------------------------------------------------------------------------------------

Post.prototype.write_post_to_file = async function(){
	await file_handling.add_to_arr_file(this, file_handling.posts_path);
}
//------------------------------------------------------------------------------------------------

const compare_posts = function(post1, post2){
	return post2.post_id - post1.post_id
}
//------------------------------------------------------------------------------------------------
module.exports = {
    Post : Post,
    compare_posts : compare_posts,
}