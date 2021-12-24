// External modules
const express = require('express')
const StatusCodes = require('http-status-codes').StatusCodes;
const package = require('./package.json');
const crypto = require('crypto');
const fs = require("fs").promises;


const status_created = "created"
const status_active = "active";
const status_suspended = "suspended"
const status_deleted = "deleted";


const app = express()
let  port = 2718;
const user_id_map = new Map();//Map(email=> ID)
let user_id = 0;
let post_id = 0;
let message_id = 0;
const tokens_map = new Map(); //Map(token=> ID)

const messages_file = "/messages.json"
const user_details_file = "/user_details.json"
const posts_path = "./posts.json";

//------------------------------------------------------------------------------------------------
// General app settings
const set_content_type = function (req, res, next) 
{
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	next()
}

app.use( set_content_type );
app.use(express.json());  // to support JSON-encoded bodies
app.use(express.urlencoded( // to support URL-encoded bodies
{  
  extended: true
}));

//------------------------------------------------------------------------------------------------
//User constructor 
const User = function(email, password, full_name){
	this.email_address = email;
	this.name = full_name;
	this.id = user_id++;
	this.status = status_created;
	this.creation_date = get_date_and_time(); 
	this.salt = crypto.randomBytes(16).toString('hex');
	this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, `sha512`).toString(`hex`);
}

const compare_user = function(user1, user2){
	return user2.id - user1.id
}

//------------------------------------------------------------------------------------------------

const Post = function(message, sender_id, email){
	this.creator_id = sender_id;
	this.email = email;
	this.message = message;
	this.creation_date = get_date_and_time(); 
	this.post_id = post_id++;
}

const compare_post = function(post1, post2){
	return post2.post_id - post1.post_id
}
//------------------------------------------------------------------------------------------------

const Message = function(message, sender, receiver, type_message){
	this.sender = sender;
	this.receiver = receiver;
	this.message = message;
	this.creation_date = get_date_and_time(); 
	this.type_message = type_message;
	this.message_id = message_id++;
}

const compare_message = function(message1, message2){
	return message2.message_id - message1.message_id
}

//------------------------------------------------------------------------------------------------

function get_date_and_time(){
	let today = new Date();
	let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
	let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
	return (date+' '+time);
}

const admin = new User("admin@gmail.com", "1234", "Admin The Admin");


// API functions

//------------------------------------------------------------------------------------------------
async function register( req, res ){

	let params = new Map();
	params.set("name", req.body.name);
	params.set("email", req.body.email);
	params.set("password", req.body.password);
	if(!check_request_params(params, res)){
		return;
	}


	const full_name = req.body.name;
	const email = req.body.email;
	const password = req.body.password;
	


	// if ( !is_valid_request( full_name, email, password, res)){
	// 	return;
	// }

	if(await check_if_email_exist(email)){
		send_error_response(StatusCodes.BAD_REQUEST, "Email is already exist", res);
		return;
	}

	const new_user = new User(email, password, full_name);

	user_id_map.set(new_user.email_address, new_user.id);


	await write_user_data_to_file(new_user);

	res.send(JSON.stringify(new_user, ['name', 'email', 'id', 'status', 'creation_date']));    
}
//------------------------------------------------------------------------------------------------
async function login(req, res){

	let params = new Map();
	params.set("email", req.body.email);
	params.set("password", req.body.password);
	if(!check_request_params(params, res)){
		return;
	}

	let email = req.body.email;
	let password = req.body.password;


	let user_data = await get_user_by_email(email);
	if( user_data == null){
		send_error_response(StatusCodes.BAD_REQUEST, "Email is not exist", res);
		return;
	}
	if(!check_password(password, user_data)){
		send_error_response(StatusCodes.BAD_REQUEST, "Password is incorrect", res);
		return;
	}
	if(!check_user_status(user_data, res)){
		return;
	}
	if(!set_token(res, user_data)){
		send_error_response(StatusCodes.UNAUTHORIZED, "The user is already logged in", res);
		return;
	}
	res.send("Logged in successfully");
}
//------------------------------------------------------------------------------------------------

function check_user_status(user_data, res){
	switch(user_data.status){
		case status_created:
			send_error_response(StatusCodes.UNAUTHORIZED, "You should wait until the Admin will approve you", res);
			return false;
		case status_suspended:
			send_error_response(StatusCodes.UNAUTHORIZED, "This account is suspended", res);
			return false;
		case status_deleted:
			send_error_response(StatusCodes.UNAUTHORIZED, "This account was deleted", res);
			return false;
		default:
			return true;
	}
}
//------------------------------------------------------------------------------------------------

function set_token(res, new_user){
	if(check_if_user_logged_in(new_user.id)){
		return false;
	}
	const token = crypto.randomBytes(7).toString("hex");
	tokens_map.set(token,new_user.id);
	res.setHeader("Token",token);
	return true;
}
//------------------------------------------------------------------------------------------------
function check_if_user_logged_in(id){
	let res = false;
	for(let v of tokens_map.values()){
		if(v === id){
			res = true;
		}
	}
	return res;
}

//------------------------------------------------------------------------------------------------
function check_password(password, user_data){

	let hash = crypto.pbkdf2Sync(password, user_data.salt.toString(), 1000, 64, `sha512`).toString(`hex`);
	return (hash == user_data.hash.toString());
}
//------------------------------------------------------------------------------------------------

async function write_user_data_to_file( new_user)
{ 	
	let path_dir = "./users/" + new_user.id
	await fs.mkdir(path_dir);
	await fs.writeFile( path_dir + user_details_file, JSON.stringify(new_user) );
}
//------------------------------------------------------------------------------------------------

async function check_if_email_exist(email)
{
	if(user_id_map.has(email)){
		return true;
	}
	return false;
}
//------------------------------------------------------------------------------------------------

async function get_user_by_email(email)
{
	if(user_id_map.has(email)){
		let id = user_id_map.get(email);
		let json_data = await read_file('./users/' + id + user_details_file);
		return JSON.parse(json_data);
	}
	return null;
}
//------------------------------------------------------------------------------------------------

async function get_user_by_id(id){
	if(! await(exists('./users/' + id + user_details_file))){
		return null;
	}
	let json_data = await read_file('./users/' + id + user_details_file);
	return await JSON.parse(json_data);
}
//------------------------------------------------------------------------------------------------

function send_error_response (status_code, message, res){
	res.status( status_code );
	res.send( message );
}
//------------------------------------------------------------------------------------------------

async function read_file(path){
	try{
		const content = await fs.readFile(path);
		return content.toString();
	}
	catch (e){
		return null;
	}
}
//------------------------------------------------------------------------------------------------

async function get_all_mails(){
	for(let i = 1; i < user_id; ++i){
		let content = await read_file('./users/' + i + user_details_file);
		if(content!= null){
			user_data = JSON.parse(content);
			user_id_map.set(user_data.email_address, user_data.id);
		}
	}
}
//------------------------------------------------------------------------------------------------

async function get_all_users(){
	const arr_users = [];
	for(let i = 1; i < user_id; ++i){
		let content = await read_file('./users/' + i + user_details_file);
		if(content!= null){
			user_data = JSON.parse(content);
			arr_users.push(user_data);
		}
	}
	return arr_users;
}
//------------------------------------------------------------------------------------------------
async function exists( path )
{
    try {
        const stat = await fs.stat( path )
        return true;
    }
    catch(e)
    {
        return false;
    }    
}
//------------------------------------------------------------------------------------------------

async function count_num_of_users()
{
	if(!(await exists('./users'))){
		user_id = 1;
		await fs.mkdir('./users');
	}
	else{
		user_id = (await fs.readdir( './users')).length;
	}

	await get_all_mails();
	console.log("get Num of Files==> num of files=%d", user_id);
}

//------------------------------------------------------------------------------------------------

async function posting_new_post(req, res){
	const id = get_id_from_token(req, res);
	if(id == null){
		send_error_response(StatusCodes.UNAUTHORIZED, "Undefined user", res);
		return;
	}

	let params = new Map();
	params.set("text", req.body.text);
	if(!check_request_params(params, res)){
		return;
	}

	const text = req.body.text;
	let user = await get_user_by_id(id)
	let post = new Post(text, id, user.email_address);
	await add_post_to_file(post);
	res.send("Your Post with id: " + post.post_id+ " was created");
}
//------------------------------------------------------------------------------------------------

async function add_post_to_file(new_post){
	let all_posts = await get_arr_from_file(posts_path);
	console.log("ADD_NEW_POST===>", new_post);
	all_posts.push(new_post);
	await write_data_to_file(all_posts, posts_path);
}
//------------------------------------------------------------------------------------------------

function get_id_from_token(req, res)
{
	const token = req.get("Token");
	if(!tokens_map.has(token)){
		return null;
	}
	const id = parseInt(tokens_map.get(token));
	return id;
}
//------------------------------------------------------------------------------------------------

async function get_all_posts(req, res){
	const id = get_id_from_token(req, res);
	if(id == null){
		send_error_response(StatusCodes.UNAUTHORIZED, "Undefined user", res);
		return;
	}
	let arr_posts = await get_arr_from_file(posts_path);
	arr_posts.sort(compare_post);
	res.send(await JSON.stringify(arr_posts, ['email', 'message', 'creation_date', 'post_id']));
}
//------------------------------------------------------------------------------------------------

async function get_arr_from_file(path)
{
	if(!(await exists(path))){
		await fs.writeFile(path, JSON.stringify([]));
	}
	let arr = await read_file(path);
	arr_json = JSON.parse(arr);
	return arr_json;
}
//------------------------------------------------------------------------------------------------

async function write_data_to_file(data ,path, mode)
{
	await fs.writeFile(path, JSON.stringify(data), {flag:mode});
}
//------------------------------------------------------------------------------------------------

async function delete_a_post(req, res)
{
	let curr_user_id = (get_id_from_token(req, res));
	if(curr_user_id == null){
		send_error_response(StatusCodes.UNAUTHORIZED, "Undefined user", res);
		return;
	}

	let params = new Map();
	params.set("id", req.body.id);
	if(!check_request_params(params, res)){
		return;
	}
	let post_to_delete = parseInt(req.body.id);

	if(! (await remove_post(post_to_delete, curr_user_id, res)) ){
		return;
	}
	res.send("Post with id: " + post_to_delete + " was deleted successfully");
}
//------------------------------------------------------------------------------------------------

async function remove_post(post_to_delete, curr_user_id, res)
{
	let post_arr = await get_arr_from_file(posts_path); 	
	const index_to_delete = find_post_to_delete(post_arr, post_to_delete, curr_user_id);

	if(post_arr.length == 0){
		send_error_response(StatusCodes.BAD_REQUEST, "There are no posts in the server", res);
		return false;
	}
	if(index_to_delete == -1){
		send_error_response(StatusCodes.BAD_REQUEST, "Invalid post id", res);
		return false;
	}
	
	post_arr.splice(index_to_delete, 1);
	write_data_to_file(post_arr, posts_path);
	return true;
}
//------------------------------------------------------------------------------------------------

function find_post_to_delete(post_arr, post_to_delete, id)
{
	let index_to_delete = -1;
	for(let i = 0; i < post_arr.length; ++i){
		curr_post = post_arr[i];
		if(curr_post.post_id == post_to_delete){
			if(curr_post.creator_id == id || id == 0){
				index_to_delete = i;
			}
		}
	}
	return index_to_delete;
}
//------------------------------------------------------------------------------------------------

async function count_num_of_posts()
{
	const arr_posts = await get_arr_from_file(posts_path);
	if(arr_posts.length == 0){
		post_id = 0;
	}
	else{
		curr_post = arr_posts[arr_posts.length-1];
		post_id = curr_post.post_id + 1;
	}
}
//------------------------------------------------------------------------------------------------
async function send_message(req, res)
{
	const id_sender = get_id_from_token(req, res);
	if(id_sender == null){
		send_error_response(StatusCodes.UNAUTHORIZED, "Undefined user", res);
		return;
	}

	
	let params = new Map();
	params.set("destination", req.body.destination);
	params.set("text", req.body.text);
	if(!check_request_params(params, res)){
		return;
	}
	
	let message_destination = req.body.destination;
	let body = req.body.text;
	let user_reciever = await get_user_by_email(message_destination);
	if(user_reciever == null){
		send_error_response(StatusCodes.BAD_REQUEST, "There is no email " + message_destination + " in the system", res);
		return;
	}
	let user_sender = await get_user_by_id(id_sender);
	const id_reciever = user_reciever.id;
	const message = new Message(body ,user_sender.email_address, user_reciever.email_address, "sent");
	await create_message(id_sender, message, "sent");
	await create_message(id_reciever, message, "recieved");
	res.send("Mail sent seccessfully!");
}
//------------------------------------------------------------------------------------------------

async function get_all_messages(req, res)
{
	const id = get_id_from_token(req, res);
	if(id == null){
		send_error_response(StatusCodes.UNAUTHORIZED, "Undefined user", res);
		return;
	}

	let arr = await get_arr_from_file('./users/' + id + messages_file);
	arr.sort(compare_message);
	//res.send(JSON.stringify(arr));
	res.send(JSON.stringify(arr,['type_message','sender', 'receiver', 'message', 'creation_date']));

}

//------------------------------------------------------------------------------------------------

async function get_all_users_by_admin(req, res)
{
	if(!check_if_admin(req,res)){
		return;
	}
	const users_arr = await get_all_users();
	users_arr.sort(compare_user);
	res.send(JSON.stringify(users_arr,['id','email_address', 'creation_date','status']));
}
//------------------------------------------------------------------------------------------------

async function update_user_status_by_admin(req, res)
{
	if(!check_if_admin(req,res)){
		return;
	}

	let params = new Map();
	params.set("id", req.body.id);
	params.set("status", req.body.status);
	if(!check_request_params(params, res)){
		return;
	}
	
	let id = parseInt(req.body.id);
	const status = req.body.status;
	let user = await get_user_by_id(id);
	if(user == null){
		send_error_response(StatusCodes.BAD_REQUEST, "Invaild id number", res);
		return;
	}

	if(check_if_valid_status(status, res)){
		user.status = status;
		await write_data_to_file(user, './users/' + id + user_details_file);
	}
	else{
		return;
	}

	res.send("Status changed successfully");
}
//------------------------------------------------------------------------------------------------

function check_if_valid_status(status, res)
{
	if(status == null){
		send_error_response(StatusCodes.BAD_REQUEST, "There is no status", res);
		return null;
	}

	if (status != "suspended" && status != "active" && status != "deleted"){
		send_error_response(StatusCodes.BAD_REQUEST, "Invalid status", res);
		return null;
	}
	
	return true;
}
//------------------------------------------------------------------------------------------------

async function send_broadcast_message_by_admin(req, res)
{
	if(!check_if_admin(req, res)){
		return;
	}
	
	let params = new Map();
	params.set("text", req.body.text);
	if(!check_request_params(params, res)){
		return;
	}
	
	let body = req.body.text;

	let users_arr = await get_all_users();
	let message = new Message(body, "Admin", "everybody", "sent" );
	await create_message(0, message, "sent");
	for( let i= 0; i< users_arr.length; i++){
		message = new Message(body, "Admin", users_arr[i].email_address, "recieved" );
		 await create_message(users_arr[i].id, message, "received");
	}

	res.send("Successfully boardcast a message!");
}
//------------------------------------------------------------------------------------------------

function check_if_admin(req, res){
	const id = get_id_from_token(req, res);
	if( id == null){
		send_error_response(StatusCodes.UNAUTHORIZED, "Undefined user", res);
		return false;
	}
	if(id != 0 ){
		send_error_response(StatusCodes.FORBIDDEN, "This request allows only to the admin", res);
		return false;
	}
	return true;
}
//------------------------------------------------------------------------------------------------

async function create_message(id, message, message_type)
{
	message.type_message = message_type;
	let messages_arr = await get_arr_from_file("./users/" + id + messages_file);
	messages_arr.push(message);
	await write_data_to_file(messages_arr, "./users/" + id+ messages_file);
}
//------------------------------------------------------------------------------------------------

async function delete_a_post_by_admin(req, res)
{
	if( !check_if_admin(req, res)){
		return;
	}

	let params = new Map();
	params.set("post_id", req.body.post_id);
	if(!check_request_params(params, res)){
		return;
	}
	
	let id_of_post = req.body.post_id;
	if(!remove_post(id_of_post, 0, res)){
		return;
	}
	res.send("The post number " + id_of_post + " deleted successfully!!");
}

//------------------------------------------------------------------------------------------------

function logout(req, res)
{
	const token = req.get("Token");
	if(token == null || !tokens_map.has(token)){
		send_error_response(StatusCodes.BAD_REQUEST, "Undefined token", res);
		return;
	}

	tokens_map.delete(token);
	res.send("Logout successfully");
}


//------------------------------------------------------------------------------------------------

async function init_admin(){
	admin.status = "active";
	user_id_map.set(admin.email_address, admin.id);
	if(! (await exists("./users/0"))){
		await write_user_data_to_file(admin);
	}
}
//------------------------------------------------------------------------------------------------

async function cout_num_of_messages(){	
	for(let i =0; i < user_id; ++i){
		if(await exists('./users/' + i + messages_file)){
			let messages_arr = await get_arr_from_file('./users/' + i + messages_file);
			for(let j = 0; j < messages_arr.length; ++j){
				let curr_message = (messages_arr[j]);
				if(message_id <= curr_message.message_id){
					message_id = curr_message.message_id +1;
				}
			}
		}
	}
}
//------------------------------------------------------------------------------------------------

function check_request_params(params, res){
	let res_message = ""
	for(let [field_name, value] of params){
		if(value == null){
			res_message += "Missing " + field_name + " field in request body \n"
		}
	}
	if(res_message != ""){
		send_error_response(StatusCodes.BAD_REQUEST, res_message, res);
		return false;
	}
	return true;
}

//------------------------------------------------------------------------------------------------

async function init_server(){
	
	await count_num_of_posts();
	await count_num_of_users();
	await cout_num_of_messages();
	init_admin();
}

// Routing

const router = express.Router();
router.post('/users/login', (req, res) => { login(req, res) })
router.post('/users/register', (req, res) => { register(req, res) })
router.put('/users/post', (req, res) => { posting_new_post(req, res) })
router.delete('/users/post', (req, res) => { delete_a_post(req, res) })
router.get('/users/post', (req, res) => { get_all_posts(req, res) })
router.put('/users/message', (req, res) => { send_message(req, res) })
router.get('/users/message', (req, res) => { get_all_messages(req, res) })
router.get('/admin/users', (req, res) => { get_all_users_by_admin(req, res) })
router.put('/admin/users', (req, res) => { update_user_status_by_admin(req, res) })
router.post('/admin/message', (req, res) => { send_broadcast_message_by_admin(req, res) })
router.delete('/admin/posts', (req, res) => { delete_a_post_by_admin(req, res) })
router.put('/users/logout', (req, res) => { logout(req, res) })
app.use('/social_network',router)

// Init 

init_server();
// get_post_nubmer();
// get_num_of_users();
// get_num_of_messages();
let msg = `${package.description} listening at port ${port}`
app.listen(port, () => { console.log( msg ) ; })