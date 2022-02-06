const utilities = require("./utilities.js");
const file_handling = require("./file_handling.js");
const status_codes = require('http-status-codes').StatusCodes;
const posts = require("./post.js");
const messages = require("./message.js");
const users = require("./user.js");
const { check_if_user_logged_in } = require("./utilities.js");


let user_id_map = new Map();//Map(email=> ID)
let tokens_map = new Map(); //Map(token=> ID, time)

let user_id = 0;
let post_id = 0;
let message_id = 0;

const admin = new users.User("admin@gmail.com", "1234", "Admin The Admin", 0);


// API functions
//------------------------------------------------------------------------------------------------

async function register( req, res ){
	let params = new Map();
	params.set("name", req.body.name);
	params.set("email", req.body.email);
	params.set("password", req.body.password);
	const req_missing_params = utilities.check_request_params(params, res);
	if(req_missing_params.status != status_codes.OK){
		send_error_response(req_missing_params.status, req_missing_params.message, res);
		return;
	}
	const full_name = req.body.name;
	const email = req.body.email;
	const password = req.body.password;
	const email_exist_return = await utilities.check_if_email_is_exist(email, user_id_map);
	if(email_exist_return.status != status_codes.OK){
		send_error_response(email_exist_return.status, email_exist_return.message, res);
		return;
	}
	const new_user = new users.User(email, password, full_name, user_id++);
	user_id_map.set(new_user.email_address, new_user.id);
	//await file_handling.write_user_data_to_file(new_user);
	await new_user.write_user_data_to_file();
	res.send(JSON.stringify(new_user, ['name', 'email', 'id', 'status', 'creation_date']));    
}
//------------------------------------------------------------------------------------------------

async function login(req, res){
	let params = new Map();
	params.set("email", req.body.email);
	params.set("password", req.body.password);
	const req_missing_params = utilities.check_request_params(params, res);
	if(req_missing_params.status != status_codes.OK){
		send_error_response(req_missing_params.status, req_missing_params.message, res);
		return;
	}
	let email = req.body.email;
	let password = req.body.password;
	let user_data = await utilities.get_user_by_email(email, user_id_map);
	if( user_data == null){
		send_error_response(status_codes.BAD_REQUEST, "Incorrect Email/Password", res);
		return;
	}
	
	if(!users.check_password(password, user_data)){
		send_error_response(status_codes.BAD_REQUEST, "Incorrect Email/Password", res);
		return;
	}
	user_status_check = users.check_user_status(user_data)
	if(user_status_check.status != status_codes.OK){
		send_error_response(user_status_check.status, user_status_check.message, res);
		return;
	}
	const is_token_set = utilities.set_token(user_data, tokens_map);
	if(is_token_set.status != status_codes.OK){
		send_error_response(is_token_set.status, is_token_set.message, res);
		return;
	}
	else{
		res.setHeader("Authorization",is_token_set.message);
		res.send(JSON.stringify(user_data,['email_address','name', 'id', 'status', 'creation_date']));
	}
}
//------------------------------------------------------------------------------------------------

async function posting_new_post(req, res){
	const get_id_response = await utilities.get_id_from_token(req.get("Authorization"),tokens_map);
	if(get_id_response.status != status_codes.OK){
		send_error_response(get_id_response.status, get_id_response.message, res);
		return;
	}
	let params = new Map();
	params.set("text", req.body.text);
	const req_missing_params = utilities.check_request_params(params, res);
	if(req_missing_params.status != status_codes.OK){
		send_error_response(req_missing_params.status, req_missing_params.message, res);
		return;
	}
	const text = req.body.text;
	let user = await utilities.get_user_by_id(get_id_response.message)
	let post = new posts.Post(text, user.id, user.name, post_id++);
	await post.write_post_to_file();
	//await file_handling.add_to_arr_file(post, file_handling.posts_path);
	res.send("Your Post with id: " + post.post_id+ " was created");
}
//------------------------------------------------------------------------------------------------

async function delete_a_post(req, res){
	const is_valid_user = await utilities.get_id_from_token(req.get("Authorization"), tokens_map);
	if(is_valid_user.status != status_codes.OK){
		send_error_response(is_valid_user.status, is_valid_user.message, res);
		return;
	}

	const curr_user_id = is_valid_user.message;
	let params = new Map();
	params.set("id", req.body.id);
	const req_missing_params = utilities.check_request_params(params, res);
	if(req_missing_params.status != status_codes.OK){
		send_error_response(req_missing_params.status, req_missing_params.message, res);
		return;
	}
	let post_to_delete = parseInt(req.body.id);
	remove_post_error_message = await utilities.remove_post(post_to_delete, curr_user_id);
	if(remove_post_error_message.status != status_codes.OK){
		send_error_response(remove_post_error_message.status,remove_post_error_message.message , res);
		return;
	}
	res.send("Post with id: " + post_to_delete + " was deleted successfully");
}
//------------------------------------------------------------------------------------------------

async function get_all_posts(req, res){
	const is_valid_user = await utilities.get_id_from_token(req.get("Authorization"), tokens_map);
	if(is_valid_user.status != status_codes.OK){
		send_error_response(is_valid_user.status,is_valid_user.message , res);
		return;
	}
	let arr_posts = await file_handling.get_arr_from_file(file_handling.posts_path);
	arr_posts.sort(posts.compare_posts);
	if(arr_posts.length == 0){
		send_error_response(status_codes.NOT_FOUND, "There are no Posts in the server", res);
		return;
	}
	arr_posts = posts.build_posts_arr(arr_posts, is_valid_user.message);
	res.send(await JSON.stringify(arr_posts, ['creator_name', 'message', 'creation_date', 'post_id', 'creator_id']));
}
//------------------------------------------------------------------------------------------------

async function send_message(req, res){
	const is_valid_user = await utilities.get_id_from_token(req.get("Authorization"), tokens_map);
	if(is_valid_user.status != status_codes.OK){
		send_error_response(is_valid_user.status,is_valid_user.message , res);
		return;
	}

	const id_sender = is_valid_user.message;

	const params = new Map();
	params.set("recipient_id", req.body.recipient_id);
	params.set("text", req.body.text);
	const req_missing_params = utilities.check_request_params(params, res);
	if(req_missing_params.status != status_codes.OK){
		send_error_response(req_missing_params.status, req_missing_params.message, res);
		return;
	}
	
	const recipient_id = parseInt(req.body.recipient_id);
	const body = req.body.text;
	const user_reciever = await utilities.get_user_by_id(recipient_id) ;
	if(user_reciever == null){
		send_error_response(status_codes.BAD_REQUEST, "There is no ID " + recipient_id + " in the system", res);
		return;
	}
	const user_sender = await utilities.get_user_by_id(id_sender);
	//const message_to_sender = new messages.Message(body ,user_sender.id, user_sender.name,user_reciever.id, user_reciever.name , "sent", message_id++);
	const message_to_reciever = new messages.Message(body ,user_sender.id, user_sender.name,user_reciever.id, user_reciever.name , "received", message_id++);
	
	//await utilities.create_message(user_sender.id, message_to_sender);
	await utilities.create_message(user_reciever.id, message_to_reciever);
	res.send("Mail sent successfully!");
}
//------------------------------------------------------------------------------------------------

async function get_all_messages(req, res){
	const is_valid_user = await utilities.get_id_from_token(req.get("Authorization"), tokens_map);
	if(is_valid_user.status != status_codes.OK){
		send_error_response(is_valid_user.status, is_valid_user.message, res);
		return;
	}
	const id = is_valid_user.message;
	let arr = await file_handling.get_arr_from_file('./users/' + id + file_handling.messages_file);
	arr.sort(messages.compare_message);
	res.send(JSON.stringify(arr,['type_message','sender_name','sender_id', 'recipient_name' ,'recipient_id', 'message', 'creation_date','message_id']));
}
//------------------------------------------------------------------------------------------------

async function send_all_users(req, res){
	const is_valid_user = await utilities.get_id_from_token(req.get("Authorization"), tokens_map);
	if(is_valid_user.status != status_codes.OK){
		send_error_response(is_valid_user.status, is_valid_user.message, res);
		return;
	}
	const users_arr = await utilities.get_all_users(user_id);
	users_arr.sort(users.compare_users);
	const id = is_valid_user.message;
	if(id == 0){
		res.send(JSON.stringify(users_arr,['id','name','email_address', 'creation_date','status']));
		return
	}
	else{
		res.send(JSON.stringify(users_arr,['id','name']));
	}
}
//------------------------------------------------------------------------------------------------

async function update_user_status_by_admin(req, res)
{
	const is_admin = await utilities.check_if_admin(req.get("Authorization"), tokens_map);
	if(is_admin.status != status_codes.OK){
		send_error_response(is_admin.status, is_admin.message, res);
		return;
	}

	let params = new Map();
	params.set("id", req.body.id);
	params.set("status", req.body.status);
	const req_missing_params = utilities.check_request_params(params, res);
	if(req_missing_params.status != status_codes.OK){
		send_error_response(req_missing_params.status, req_missing_params.message, res);
		return;
	}
	
	
	let id = parseInt(req.body.id);
	const status = req.body.status;
	let user = await utilities.get_user_by_id(id);
	if(user == null){
		send_error_response(status_codes.BAD_REQUEST, "Invaild id number", res);
		return;
	}
	if(user.status == users.status_deleted){
		send_error_response(status_codes.BAD_REQUEST, "This user was deleted, and cannot change it's status", res);
		return;
	}
	let invalid_status_message = users.check_if_valid_status(status);
	if(invalid_status_message == null){
		user.status = status;
		for(let v of tokens_map.values()){

		}
		await file_handling.write_data_to_file(user, './users/' + id + file_handling.user_details_file);
		res.send("Status changed successfully");
	}
	else{
		send_error_response(status_codes.BAD_REQUEST, invalid_status_message, res);
	}
}
//------------------------------------------------------------------------------------------------

async function send_broadcast_message_by_admin(req, res){
	const is_admin = await utilities.check_if_admin(req.get("Authorization"), tokens_map);
	if(is_admin.status != status_codes.OK){
		send_error_response(is_admin.status, is_admin.message, res);
		return;
	}
	let params = new Map();
	params.set("text", req.body.text);
	const req_missing_params = utilities.check_request_params(params, res);
	if(req_missing_params.status != status_codes.OK){
		send_error_response(req_missing_params.status, req_missing_params.message, res);
		return;
	}
	let body = req.body.text;
	let users_arr = await utilities.get_all_users(user_id);
	let message = new messages.Message(body, admin.id, admin.name, 0, "Everbody", "sent", message_id++);
	//await utilities.create_message(0, message, "sent");
	for( let i= 0; i< users_arr.length; i++){
		message = new messages.Message(body, admin.id, admin.name ,users_arr[i].id,users_arr[i].name, "received", message_id++);
		 await utilities.create_message(users_arr[i].id, message, "received");
	}
	res.send("Successfully broadcast a message!");
}
//------------------------------------------------------------------------------------------------

async function delete_a_post_by_admin(req, res){
	const is_admin = await utilities.check_if_admin(req.get("Authorization"),tokens_map);
	if(is_admin.status != status_codes.OK){
		send_error_response(is_admin.status, is_admin.message, res);
		return;
	}
	let params = new Map();
	params.set("post_id", req.body.post_id);
	const req_missing_params_message = utilities.check_request_params(params, res);
	if(req_missing_params_message.status != status_codes.OK){
		send_error_response(req_missing_params_message.status,req_missing_params_message.message , res);
		return;
	}
	let id_of_post = req.body.post_id;

	const is_removed_successfully = await utilities.remove_post(id_of_post, 0);
	if(is_removed_successfully.status != status_codes.OK){
		send_error_response(is_removed_successfully.status,is_removed_successfully.message , res);
		return;
	}
	
	res.send("Post number " + id_of_post + " deleted successfully!!");
}

//------------------------------------------------------------------------------------------------

async function logout(req, res)
{
	const token = req.get("Authorization");
	const is_removed = await utilities.remove_token(token, tokens_map);
	if(is_removed.status != status_codes.OK){
		send_error_response(is_removed.status,is_removed.message, res);
		return;
	}
	res.send("Logout successfully");
}
//------------------------------------------------------------------------------------------------

function send_error_response (status_code, message, res){
	res.status( status_code );
	res.send( message );
}
//------------------------------------------------------------------------------------------------

async function init_admin(){
	admin.status = "active";
	user_id_map.set(admin.email_address, admin.id);
	if(! (await file_handling.exists("./users/0"))){
		await admin.write_user_data_to_file();
	}
}
//------------------------------------------------------------------------------------------------

async function init_server(){
	user_id = await utilities.count_num_of_users();
	message_id = await utilities.cout_num_of_messages(user_id)
	post_id = await utilities.count_num_of_posts();
	await init_admin();
	await utilities.build_users_map(user_id,user_id_map);
}
//------------------------------------------------------------------------------------------------
module.exports = {
    register : register,
	login : login,
	posting_new_post : posting_new_post,
	delete_a_post : delete_a_post,
	get_all_posts : get_all_posts,
	send_message : send_message,
	get_all_messages : get_all_messages,
	send_all_users : send_all_users,
	update_user_status_by_admin : update_user_status_by_admin,
	send_broadcast_message_by_admin : send_broadcast_message_by_admin,
	delete_a_post_by_admin : delete_a_post_by_admin,
	logout : logout,
	init_server : init_server,
}