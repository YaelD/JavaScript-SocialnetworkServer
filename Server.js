// External modules
const express = require('express')
const StatusCodes = require('http-status-codes').StatusCodes;
const package = require('./package.json');
const crypto = require('crypto');
const fs = require("fs").promises;


const app = express()
let  port = 2718;
const user_id_map = new Map();//Map(email=> ID)
let user_id = 0;
let post_id = 0;
let message_id = 0;
const tokens_map = new Map(); //Map(token=> ID)
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

// User's table
const g_users = [ {id:1, name: 'Root'} ];


//------------------------------------------------------------------------------------------------
//User constructor 
const User = function(email, password, full_name){
	this.email_address = email;
	this.name = full_name;
	this.id = user_id++;
	this.status = "created";
	this.creation_date = get_date_and_time(); 
	this.salt = crypto.randomBytes(16).toString('hex');
	this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, `sha512`).toString(`hex`);
}
//------------------------------------------------------------------------------------------------

const Post = function(message, sender_id){
	this.creator_id = sender_id;
	this.message = message;
	this.creation_date = get_date_and_time(); 
	this.post_id = 38;
}
//------------------------------------------------------------------------------------------------

const Message = function(message, sender_id, receiver_id, type_message){
	this.sender_id = sender_id;
	this.receiver_id = receiver_id;
	this.message = message;
	this.creation_date = get_date_and_time(); 
	this.type_message = type_message;
	this.message_id = 1;
}
//------------------------------------------------------------------------------------------------

function get_date_and_time(){
	let today = new Date();
	let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
	let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
	return (date+' '+time);
}


// API functions

// Version 
function get_version( req, res) 
{
	const version_obj = { version: package.version, description: package.description };
	res.send(  JSON.stringify( version_obj) );   
}

function list_users( req, res) 
{
	res.send(  JSON.stringify( g_users) );   
}

function get_user( req, res )
{
	const id =  parseInt( req.params.id );

	if ( id <= 0)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Bad id given")
		return;
	}

	const user =  g_users.find( user =>  user.id == id )
	if ( !user)
	{
		res.status( StatusCodes.NOT_FOUND );
		res.send( "No such user")
		return;
	}

	res.send(  JSON.stringify( user) );   
}

function delete_user( req, res )
{
	const id =  parseInt( req.params.id );

	if ( id <= 0)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Bad id given")
		return;
	}

	if ( id == 1)
	{
		res.status( StatusCodes.FORBIDDEN ); // Forbidden
		res.send( "Can't delete root user")
		return;		
	}

	const idx =  g_users.findIndex( user =>  user.id == id )
	if ( idx < 0 )
	{
		res.status( StatusCodes.NOT_FOUND );
		res.send( "No such user")
		return;
	}

	g_users.splice( idx, 1 )
	res.send(  JSON.stringify( {}) );   
}
//------------------------------------------------------------------------------------------------
async function register( req, res )
{
	const full_name = req.body.name;
	const email = req.body.email;
	const password = req.body.password;

	if ( !is_valid_request( full_name, email, password, res)){
		return;
	}

	if(await check_if_email_exist(email)){
		send_error_response(StatusCodes.BAD_REQUEST, "Email is already exist", res);
		return;
	}

	const new_user = new User(email, password, full_name);
	g_users.push( new_user );
	set_token(res, new_user);

	user_id_map.set(new_user.email_address, new_user.id);


	await write_user_data_to_file(new_user);

	res.send(JSON.stringify(new_user, ['name', 'email', 'id', 'status', 'creation_date']));    
}
//------------------------------------------------------------------------------------------------
async function login(req, res){
	let email = req.body.email;
	let password = req.body.password;

	let user_data = await get_user_by_email(email);
	if( user_data == null){
		send_error_response(StatusCodes.BAD_REQUEST, "Email is not exist", res);
		return;
	}
	if(!check_password(password, user_data)){
		send_error_response(StatusCodes.BAD_REQUEST, "Password is incorrect", res);
	}
	set_token(res, user_data);
	res.send();
}

//------------------------------------------------------------------------------------------------

function set_token(res, new_user){
	const token = crypto.randomBytes(7).toString("hex");
	tokens_map.set(token,new_user.id);
	res.setHeader("Token",token);
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
	//console.log("IN CHECK_EMAIL===>", user_id_map.has(email));
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
async function exists( path )
{
    try {
        const stat = await fs.stat( path )
        return true;
    }
    catch( e )
    {
        return false;
    }    
}
//------------------------------------------------------------------------------------------------
async function get_num_of_files()
{
	if(!(await exists('./users'))){
		user_id = 1;
		await fs.mkdir('./users');
	}
	user_id = (await fs.readdir( './users')).length +1;
	await get_all_mails();
	//console.log("get Num of Files==> num of files=%d", user_id);
}
//------------------------------------------------------------------------------------------------

function is_valid_request ( full_name, email, password, res )
{
	let is_valid = true;
	if ( !full_name )
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Missing name in request");
		is_valid = false;
	}
	else if ( !email )
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Missing email in request");
		is_valid = false;
	}
	else if( !password )
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Missing password in request");
		is_valid = false;
	}

	return is_valid;
}
//------------------------------------------------------------------------------------------------

function update_user( req, res )
{
	const id =  parseInt( req.params.id );

	if ( id <= 0)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Bad id given")
		return;
	}

	const idx =  g_users.findIndex( user =>  user.id == id )
	if ( idx < 0 )
	{
		res.status( StatusCodes.NOT_FOUND );
		res.send( "No such user")
		return;
	}

	const name = req.body.name;

	if ( !name)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Missing name in request")
		return;
	}

	const user = g_users[idx];
	user.name = name;

	res.send(  JSON.stringify( {user}) );   
}
//------------------------------------------------------------------------------------------------

async function posting_new_post(req, res){
	
	const message = req.body.message;

	let id = get_id_from_token(req, res);
	if(id == null){
		return;
	}
	
	let post = new Post(message, id);
	let post_json = JSON.stringify(post);
	await add_post_to_file(post_json);
	//await write_data_to_file(","+post_json + "\n", "./posts", "a");
	res.send("Your Post with id: " + post.post_id+ " was created");
}
//------------------------------------------------------------------------------------------------
async function add_post_to_file(new_post){
	let all_posts = await get_all_posts();
	console.log("ADD_NEW_POST===>", new_post);
	all_posts.push(new_post);
	await write_data_to_file(all_posts, posts_path);
}

//------------------------------------------------------------------------------------------------
function get_id_from_token(req, res)
{
	const token = req.get("Token");
	if(!tokens_map.has(token)){
		send_error_response(StatusCodes.UNAUTHORIZED, "Undefined user", res);
		return null;
	}
	const id = parseInt(tokens_map.get(token));
	return id;
}
//------------------------------------------------------------------------------------------------
async function send_all_posts(req, res){
	const id = get_id_from_token(req, res);
	let arr_posts = await get_all_posts();
	res.send(JSON.stringify(arr_posts));
}
//------------------------------------------------------------------------------------------------

async function get_all_posts()
{
	if(!(await exists(posts_path))){
		await fs.writeFile(posts_path, JSON.stringify([]));
	}
	let posts = await read_file(posts_path);
	posts_json = JSON.parse(posts);
	return posts_json;
}

//------------------------------------------------------------------------------------------------
async function write_data_to_file(data ,path, mode)
{
	await fs.writeFile(path, JSON.stringify(data), {flag:mode});
}

//------------------------------------------------------------------------------------------------

async function delete_a_post(req, res)
{
	let post_to_delete = parseInt(req.body.id);
	let id = (get_id_from_token(req, res));
	if(id == null){
		return;
	}
	let arr_posts = await get_all_posts(); 	
	const index_to_delete = find_post_to_delete(post_arr, post_to_delete, id);

	if(arr_posts.length == 0){
		send_error_response(StatusCodes.BAD_REQUEST, "There are no posts in the server", res);
		return;
	}
	if(index_to_delete == -1){
		send_error_response(StatusCodes.BAD_REQUEST, "Invalid post id", res);
		return
	}
	
	arr_posts.splice(index_to_delete, 1);
	write_data_to_file(arr_posts, posts_path);
	res.send("Post with id: ", post_to_delete, "was deleted successfully");
}
//------------------------------------------------------------------------------------------------

function find_post_to_delete(post_arr, post_to_delete, id)
{
	let index_to_delete = -1;
	for(let i = 0; i < arr_posts.length; ++i){
		curr_post = JSON.parse(arr_posts[i]);
		if(curr_post.post_id == post_to_delete){
			if(curr_post.creator_id == id){
				index_to_delete = i;
			}
		}
	}
	return index_to_delete;
}
//------------------------------------------------------------------------------------------------

async function get_post_nubmer()
{
	const arr_posts = await get_all_posts();
	if(arr_posts.length == 0){
		post_id = 0;
	}
	else{
		curr_post = JSON.parse(arr_posts[length-1]);
		post_id = curr_post.post_id + 1;
	}
}
//------------------------------------------------------------------------------------------------
function send_message(req, res)
{
	let message_destination = req.body.destination;
	let user_reciever = get_user_by_email(message_destination);
	const id_sender = get_id_from_token(req, res);

	if(id_sender == null){
		return;
	}

	if(email == null){
		send_error_response(StatusCodes.BAD_REQUEST, "Incorrect destination email", res);
		return;
	}

	const id_reciever = user_reciever.id;
	
	
	


	

	



}



// Routing

const router = express.Router();

router.post('/users/login', (req, res) => { login(req, res) })
router.post('/users/register', (req, res) => { register(req, res) })
router.put('/users/post', (req, res) => { posting_new_post(req, res) })
router.delete('/users/post', (req, res) => { delete_a_post(req, res) })
router.get('/users/post', (req, res) => { send_all_posts(req, res) })
router.put('/users/(:id)/message', (req, res) => { send_message(req, res) })
router.get('/users/(:id)/message', (req, res) => { get_all_messages(req, res) })
router.get('/admin/users', (req, res) => { get_all_users_by_admin(req, res) })
router.put('/admin/users/(:id)', (req, res) => { update_user_status_by_admin(req, res) })
router.post('/admin/message', (req, res) => { send_broadcast_message_by_admin(req, res) })
router.delete('/admin/user/(:id)/posts/(:post_id)', (req, res) => { delete_a_post_by_admin(req, res) })
router.put('/users/logout', (req, res) => { delete_a_post_by_admin(req, res) })
app.use('/api',router)

// Init 

//init_server();
get_post_nubmer();
get_num_of_files();
let msg = `${package.description} listening at port ${port}`
app.listen(port, () => { console.log( msg ) ; })