const status_codes = require('http-status-codes').StatusCodes;

//------------------------------------------------------------------------------------------------
const validator_response = function(status, message){
	this.status = status;
	this.message = message;
}
//------------------------------------------------------------------------------------------------

async function check_if_email_is_exist(email, user_id_map)
{
    if(user_id_map.has(email)){
        return new validator_response(status_codes.BAD_REQUEST, "Email is already exist");
	}
	return new validator_response(status_codes.OK, "");
}
//------------------------------------------------------------------------------------------------

function get_id_from_token(token, tokens_map)
{
    if(!tokens_map.has(token)){
        return new validator_response(status_codes.BAD_REQUEST, "Invalid User")
	}
	const token_value = tokens_map.get(token);
	const time = token_value.start_time;
	if(Date.now() - time > ten_minutes){
        tokens_map.delete(token);
		return new validator_response(status_codes.BAD_REQUEST, "Logget out automaticlly due timeout")
	}
	//const id = parseInt(token_value.id);
	return new validator_response(status_codes.OK, token_value.id)
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
		return new validator_response(status_codes.OK, res_message);
	}
	else{
        return new validator_response(status_codes.BAD_REQUEST, res_message);
    }

}
//------------------------------------------------------------------------------------------------

function check_post_to_delete(index_to_delete, post_arr){
    if(post_arr.length == 0){
		return new validator_response(status_codes.NOT_FOUND,"There are no posts in the server") ;
	}
	if(index_to_delete == -1){
        //return "Invalid post id"
		return new validator_response(status_codes.BAD_REQUEST,"Invalid post id") ;
	}
    return new validator_response(status_codes.OK, "");
}

module.exports = {
    check_post_to_delete : check_post_to_delete, 
    check_request_params : check_request_params,
    check_if_user_logged_in, check_if_user_logged_in
}






//------------------------------------------------------------------------------------------------
function check_if_user_logged_in(id, tokens_map){
    let res = false;
	for(let v of tokens_map.values()){
        if(v.id == id){
            return new validator_response(status_codes.BAD_REQUEST, "User is already logged in");
		}
	}
	return validator_response(status_codes.OK, "");
}

//------------------------------------------------------------------------------------------------
function check_if_admin(token, tokens_map){
	const is_valid_user = get_id_from_token(token, tokens_map);
	if(is_valid_user.status != status_codes.OK){
		return is_valid_user;
	}
	const id = is_valid_user.message
	if(id != 0 ){
		return new validator_response(status_codes.UNAUTHORIZED, "This request allows only to the admin");

	}
	return new validator_response(status_codes.OK,"");
}
//------------------------------------------------------------------------------------------------


async function remove_token(token, tokens_map){
	if(token == null || !tokens_map.has(token)){

		return new validator_response(status_codes.BAD_REQUEST,"Undefined token")
	}

	tokens_map.delete(token);
	return new validator_response(status_codes.OK,"");
}

//------------------------------------------------------------------------------------------------
