// External modules
const express = require('express')
const StatusCodes = require('http-status-codes').StatusCodes;
const package = require('./package.json');

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


const User = function(email, password, full_name){
	this.email_address = email;
	this.password = password;
	this.name = full_name;
	this.id = user_id++;
	this.status = "created";
	let today = new Date();
	let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
	let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
	this.creation_date = date+' '+time; 
}




// User's table
const g_users = [ {id:1, name: 'Root'} ];

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

function create_user( req, res )
{
	const name = req.body.name;

	if ( !name)
	{
		res.status( StatusCodes.BAD_REQUEST );
		res.send( "Missing name in request")
		return;
	}


	// Find max id 
	let max_id = 0;
	g_users.forEach(
		item => { max_id = Math.max( max_id, item.id) }
	)

	const new_id = max_id + 1;
	const new_user = { id: new_id , name: name};
	g_users.push( new_user  );
	
	res.send(  JSON.stringify( new_user) );   
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

//router.get('/version', (req, res) => { get_version(req, res )  } )
router.get('/users', (req, res) => { list_users(req, res )  } )
router.post('/users', (req, res) => { create_user(req, res )  } )
router.put('/user/(:id)', (req, res) => { update_user(req, res )  } )
router.get('/user/(:id)', (req, res) => { get_user(req, res )  })
router.delete('/user/(:id)', (req, res) => { delete_user(req, res )  })




app.use('/api',router)


// Init 

let msg = `${package.description} listening at port ${port}`
app.listen(port, () => { console.log( msg ) ; })



