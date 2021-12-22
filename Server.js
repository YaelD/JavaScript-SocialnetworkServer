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
const tokens_map = new Map();
const user_details_file = "/user_details.json"

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
	let today = new Date();
	let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
	let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
	this.creation_date = date+' '+time; 
	this.salt = crypto.randomBytes(16).toString('hex');
	this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, `sha512`).toString(`hex`);
}
//------------------------------------------------------------------------------------------------



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

	let user_data = get_user_by_email(email);
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
	console.log("IN CHECK_EMAIL===>", user_id_map.has(email));
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
	console.log("get Num of Files==> num of files=%d", user_id);
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
// Routing

const router = express.Router();

router.post('/users/login', (req, res) => { login(req, res) })
router.post('/users/register', (req, res) => { register(req, res) })
router.put('/users/(:id)/post', (req, res) => { posting_new_post(req, res) })
router.delete('/users/(:id)/post/(:post_id)', (req, res) => { delete_a_post(req, res) })
router.get('/users/(:id)/post', (req, res) => { get_all_user_posts(req, res) })
router.put('/users/(:id)/message', (req, res) => { send_message(req, res) })
router.get('/users/(:id)/message', (req, res) => { get_all_messages(req, res) })
router.get('/admin/users', (req, res) => { get_all_users_by_admin(req, res) })
router.put('/admin/users/(:id)', (req, res) => { update_user_status_by_admin(req, res) })
router.post('/admin/message', (req, res) => { send_broadcast_message_by_admin(req, res) })
router.delete('/admin/user/(:id)/posts/(:post_id)', (req, res) => { delete_a_post_by_admin(req, res) })

app.use('/api',router)


// Init 

//init_server();
get_num_of_files();
let msg = `${package.description} listening at port ${port}`
app.listen(port, () => { console.log( msg ) ; })