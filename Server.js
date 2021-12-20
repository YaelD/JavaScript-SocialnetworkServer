// External modules
const express = require('express')
const StatusCodes = require('http-status-codes').StatusCodes;
const package = require('./package.json');
const crypto = require('crypto');
const fs = require("fs").promises;

const app = express()
let  port = 2718;

let user_id = 0;

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


// User's table
const g_users = [ {id:1, name: 'Root'} ];

const user_details_file = "/user_details.json"
//const posts

const tokens = [];

const Token = function(user_id, user_token){
	this.id = user_id;
	this.token = user_token;
}


//User constructor 
const User = function(email, password, full_name){
	this.email_address = email;
	this.name = full_name;
	this.id = find_max_id();
	this.status = "created";
	let today = new Date();
	let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
	let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
	this.creation_date = date+' '+time; 
	this.salt = crypto.randomBytes(16).toString('hex');
	this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, `sha512`).toString(`hex`);
}

function find_max_id()
{
	let max_id = 0;
	g_users.forEach(
		item => { max_id = Math.max( max_id, item.id) }
	)
	return (max_id+1);
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

async function register( req, res )
{
	const full_name = req.body.name;
	const email = req.body.email;
	const password = req.body.password;

	if ( !is_valid_request( full_name, email, password, res)){
		return;
	}

	if(check_if_email_exist(email, res)){
		return;
	}

	const new_user = new User(email, password, full_name);
	g_users.push( new_user );

	const token = crypto.randomBytes(7).toString("hex");
	tokens.push(new Token(new_user.id, token));
	res.setHeader("Token",token);

	write_user_data_to_file(new_user);

	res.send(JSON.stringify(new_user, ['name', 'email', 'id', 'status', 'creation_date']));    
}

async function write_user_data_to_file( new_user)
{ 	
	let path_dir = "./users/" + new_user.id
	await fs.mkdir(path_dir, (err) => {
		if (err) {
			console.log(err);
		}
		console.log("Directory is created.");
	});
	//let path = new_user.id + user_details_file;
	await fs.writeFile( path_dir + user_details_file, JSON.stringify(new_user) );
}

async function check_if_email_exist(email, res)
{
	let is_email_exist = false;
	for( let i = 1; i < user_id; i++)
	{
		let json_data = await fs.readFile( './users/' + i + user_details_file );
		let user_data =JSON.parse(json_data);
		if(user_data.email == email)
		{
			is_email_exist = true;
			res.status( StatusCodes.BAD_REQUEST );
			res.send("Email is already exist");
		}
	}
	return is_email_exist;
}

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

async function get_num_of_files()
{
	if(!(await exists('./users'))){
		user_id = 1;
		await fs.mkdir('./users');
	}

	await fs.readdir( './users', (error, files) => { 
		if(error){
			user_id = 1;
			fs.mkdir('./users');
		}
		else{
			user_id = files.length; // return the number of files
			console.log(totalFiles); // print the total number of files
		}
	 });
	 
}

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

// Routing

const router = express.Router();

// router.get('/version', (req, res) => { get_version(req, res )  } )
// router.get('/users', (req, res) => { list_users(req, res )  } )
// router.post('/users', (req, res) => { create_user(req, res )  } )
// router.put('/user/(:id)', (req, res) => { update_user(req, res )  } )
// router.get('/user/(:id)', (req, res) => { get_user(req, res )  })
// router.delete('/user/(:id)', (req, res) => { delete_user(req, res )  })

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