const file_handling = require("./file_handling.js");
const status_codes = require('http-status-codes').StatusCodes;
const crypto = require('crypto');

//------------------------------------------------------------------------------------------------

const ten_minutes = 600000;

//------------------------------------------------------------------------------------------------

const UtilitiesResponse = function(status, message){
	this.status = status;
	this.message = message;
}
//------------------------------------------------------------------------------------------------

const token_map_value = function(id, start_time){
	this.id = id;
	this.start_time = start_time;
}
//------------------------------------------------------------------------------------------------

async function check_if_email_is_exist(email, user_id_map)
{
	if(user_id_map.has(email)){
		return new UtilitiesResponse(status_codes.BAD_REQUEST, "Email is already exist");
	}
	return new UtilitiesResponse(status_codes.OK, "");
}
//------------------------------------------------------------------------------------------------

async function get_id_from_token(token, tokens_map)
{
	if(!tokens_map.has(token)){
		return new UtilitiesResponse(status_codes.UNAUTHORIZED, "Invalid User")
	}
	const token_value = tokens_map.get(token);
	const time = token_value.start_time;
	// if(Date.now() - time > ten_minutes){
	// 	tokens_map.delete(token);
	// 	return new UtilitiesResponse(status_codes.BAD_REQUEST, "Logget out automaticlly due timeout")
	// }
	const user = await get_user_by_id(token_value.id)
	if(user.status != "active"){
		return new UtilitiesResponse(status_codes.UNAUTHORIZED, "This account is " + user.status);

	}
	return new UtilitiesResponse(status_codes.OK, token_value.id)
}
//------------------------------------------------------------------------------------------------

function get_date_and_time(){
	let today = new Date();
	let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
	let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
	return (date+' '+time);
}
//------------------------------------------------------------------------------------------------

async function count_num_of_posts(){
    let count = 0;
	const arr_posts = await file_handling.get_arr_from_file(file_handling.posts_path);
	if(arr_posts.length == 0){
		count = 0;
	}
	else{
		curr_post = arr_posts[arr_posts.length-1];
		count = curr_post.post_id + 1;
	}
    return count;
}
//------------------------------------------------------------------------------------------------

async function get_user_by_email(email, user_id_map)
{
	if(user_id_map.has(email)){
		let id = user_id_map.get(email);
		let json_data = await file_handling.read_file('./users/' + id + file_handling.user_details_file); 
		return JSON.parse(json_data);
		
	}
	return null;
}
//------------------------------------------------------------------------------------------------

function check_request_params(params){
	let res_message = ""
	for(let [field_name, value] of params){
		if(value == null){
			res_message += "Missing " + field_name + " field in request body \n"
		}
	}
	if(res_message == ""){
        //return null
		return new UtilitiesResponse(status_codes.OK, res_message);
	}
	return new UtilitiesResponse(status_codes.BAD_REQUEST, res_message);

}
//------------------------------------------------------------------------------------------------

async function remove_post(post_to_delete, curr_user_id)
{
    let message = ""
	let post_arr = await file_handling.get_arr_from_file(file_handling.posts_path); 	
	const index_to_delete = find_post_to_delete(post_arr, post_to_delete, curr_user_id);

	if(post_arr.length == 0){
        
		return new UtilitiesResponse(status_codes.NOT_FOUND,"There are no posts in the server") ;
	}
	if(index_to_delete == -1){
        //return "Invalid post id"
		return new UtilitiesResponse(status_codes.BAD_REQUEST,"Invalid post id") ;

	}
	post_arr.splice(index_to_delete, 1);
	file_handling.write_data_to_file(post_arr, file_handling.posts_path);
	return new UtilitiesResponse(status_codes.OK,"");
}
//------------------------------------------------------------------------------------------------

async function get_user_by_id(id){
	if(! await(file_handling.exists('./users/' + id + file_handling.user_details_file))){
		return null;
	}
	let json_data = await file_handling.read_file('./users/' + id + file_handling.user_details_file);
	return await JSON.parse(json_data);
}
//------------------------------------------------------------------------------------------------

function check_if_user_logged_in(id, tokens_map){
	let res = false;
	for(let v of tokens_map.values()){
		if(v.id == id){
			res = true;
		}
	}
	return res;
}
//------------------------------------------------------------------------------------------------

function set_token(new_user, tokens_map){
	if(check_if_user_logged_in(new_user.id, tokens_map)){
		return new UtilitiesResponse(status_codes.BAD_REQUEST, "User is already logged in");
	}
	const curr_token = crypto.randomBytes(7).toString("hex");
	const curr_time = Date.now();
	const new_token_value = new token_map_value(new_user.id, curr_time);
	tokens_map.set(curr_token, new_token_value);
	token_json = JSON.stringify({
		token: curr_token
	})

	return new UtilitiesResponse(status_codes.OK, token_json);
}
//------------------------------------------------------------------------------------------------

async function check_if_admin(token, tokens_map){
	const is_valid_user = await get_id_from_token(token, tokens_map);
	if(is_valid_user.status != status_codes.OK){
		return is_valid_user;
	}
	const id = is_valid_user.message
	if(id != 0 ){
		return new UtilitiesResponse(status_codes.UNAUTHORIZED, "This request allows only to the admin");

	}
	return new UtilitiesResponse(status_codes.OK,"");
}
//------------------------------------------------------------------------------------------------

async function create_message(id, message, message_type)
{
	await file_handling.add_to_arr_file(message, "./users/" + id + file_handling.messages_file);
}
//------------------------------------------------------------------------------------------------

function find_post_to_delete(post_arr, post_to_delete, creator_id){
	let index_to_delete = -1;
	for(let i = 0; i < post_arr.length; ++i){
		curr_post = post_arr[i];
		if(curr_post.post_id == post_to_delete){
			if(curr_post.creator_id == creator_id || creator_id == 0){
				index_to_delete = i;
			}
		}
	}
	return index_to_delete;
}
//------------------------------------------------------------------------------------------------

async function build_users_map(num_of_users, user_id_map){
	for(let i = 1; i < num_of_users; ++i){
		let content = await file_handling.read_file('./users/' + i + file_handling.user_details_file);
		if(content!= null){
			user_data = JSON.parse(content);
			user_id_map.set(user_data.email_address, user_data.id);
		}
	}
}

//------------------------------------------------------------------------------------------------

async function cout_num_of_messages(num_of_users){
    let max = 0;	
	for(let i =0; i < num_of_users; ++i){
		if(await file_handling.exists('./users/' + i + file_handling.messages_file)){
			let messages_arr = await file_handling.get_arr_from_file('./users/' + i + file_handling.messages_file);
			for(let j = 0; j < messages_arr.length; ++j){
				let curr_message = (messages_arr[j]);
				if(max <= curr_message.message_id){
					max = curr_message.message_id +1;
				}
			}
		}
	}
    return max;
}
//------------------------------------------------------------------------------------------------

async function count_num_of_users(){
	count = 0;
	if(!(await file_handling.exists('./users'))){
		count = 1;
		await file_handling.fs.mkdir('./users');
	}
	else{
		count = (await file_handling.fs.readdir( './users')).length;
	}
	return count;
}
//------------------------------------------------------------------------------------------------

async function remove_token(token, tokens_map){
	if(token == null || !tokens_map.has(token)){

		return new UtilitiesResponse(status_codes.BAD_REQUEST,"Undefined token")
	}

	tokens_map.delete(token);
	return new UtilitiesResponse(status_codes.OK,"");
}
//------------------------------------------------------------------------------------------------

async function get_all_users(num_of_users){
	const arr_users = [];
	for(let i = 1; i < num_of_users; ++i){
		let content = await file_handling.read_file('./users/' + i + file_handling.user_details_file);
		if(content!= null){
			user_data = JSON.parse(content);
			arr_users.push(user_data);
		}
	}
	return arr_users;
}
//------------------------------------------------------------------------------------------------

module.exports = {
    get_user_by_email : get_user_by_email,
    check_request_params : check_request_params,
    check_if_email_is_exist : check_if_email_is_exist,
    get_id_from_token : get_id_from_token,
    remove_post : remove_post,
	check_if_admin : check_if_admin,
	get_user_by_id : get_user_by_id,
	check_if_user_logged_in : check_if_user_logged_in,
	set_token : set_token,
	get_date_and_time : get_date_and_time,
	remove_token : remove_token,
	build_users_map : build_users_map,
	cout_num_of_messages : cout_num_of_messages,
	count_num_of_users : count_num_of_users,
	count_num_of_posts : count_num_of_posts,
	UtilitiesResponse : UtilitiesResponse,
	get_all_users:get_all_users,
	create_message : create_message
}