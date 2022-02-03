// External modules
const express = require('express')
const package = require('./package.json');
const server_functions = require("./server_functions");

const app = express()

const  port = 2718;

//------------------------------------------------------------------------------------------------
// General app settings
const set_content_type = function (req, res, next) 
{
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.setHeader("Access-Control-Allow-Origin", "*");
	//res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	res.setHeader("Access-Control-Allow-Headers" ,"Content-Type, Authorization");
	next()
}

app.use( set_content_type );
app.use(express.json());  // to support JSON-encoded bodies
app.use(express.urlencoded( // to support URL-encoded bodies
{  
  extended: true
}));
//------------------------------------------------------------------------------------------------

const router = express.Router();
router.post('/users/login', (req, res) => { server_functions.login(req, res) })
router.post('/users/register', (req, res) => { server_functions.register(req, res) })
router.put('/users/post', (req, res) => { server_functions.posting_new_post(req, res) })
router.delete('/users/post', (req, res) => { server_functions.delete_a_post(req, res) })
router.get('/users/post', (req, res) => { server_functions.get_all_posts(req, res) })
router.put('/users/message', (req, res) => { server_functions.send_message(req, res) })
router.get('/users/message', (req, res) => { server_functions.get_all_messages(req, res) })
router.get('/users', (req, res) => { server_functions.send_all_users(req, res) })
router.put('/admin/users', (req, res) => { server_functions.update_user_status_by_admin(req, res) })
router.post('/admin/message', (req, res) => { server_functions.send_broadcast_message_by_admin(req, res) })
router.delete('/admin/posts', (req, res) => { server_functions.delete_a_post_by_admin(req, res) })
router.put('/users/logout', (req, res) => { server_functions.logout(req, res) })
app.use('/social_network',router)

server_functions.init_server();
let msg = `${package.description} listening at port ${port}`
app.listen(port, () => { console.log( msg ) ; })