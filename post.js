const file_handling = require("./file_handling.js");
const utilities = require("./utilities")
//------------------------------------------------------------------------------------------------

const Post = function(message, sender_id, name, post_id){
	this.creator_id = sender_id;
	this.creator_name = name;
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

const build_posts_arr = function(post_arr, user_id){
	let found = false;
	let index;
	for(let i=0; i < post_arr.length; ++i){
		if(post_arr[i].creator_id == user_id){
			found = true;
			index = i;
			break;
		}
	}
	if(found == true){
		let saver = post_arr[index];
		post_arr.splice(index, 1);
		post_arr.unshift(saver);
	}
}

//------------------------------------------------------------------------------------------------
module.exports = {
    Post : Post,
    compare_posts : compare_posts,
	build_posts_arr: build_posts_arr
}