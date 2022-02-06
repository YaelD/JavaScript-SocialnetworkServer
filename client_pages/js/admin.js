
class UserData extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            user: this.props.user,
            status: this.props.user.status
        };
        this.handleChange = this.handleChange.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
        console.log("IN USER DATA c'tor:", this.state.user);
    }

    async componentDidUpdate(prevProps) {
        if (prevProps.user.id != this.props.user.id) {
            console.log("in componenet did Update");
            this.setState({
                user: this.props.user
            });
        }
    }

    handleChange(event) {
        console.log(event.target.value);
        console.log(this.state.status);
        this.setState({ status: event.target.value });
    }

    onSubmit(event) {
        event.preventDefault();
        this.props.onStatusChange(this.state.user.id, this.state.status);
    }

    render() {
        return React.createElement(
            "div",
            null,
            React.createElement(
                "div",
                { id: "user_data" },
                React.createElement(
                    "label",
                    null,
                    "Name: ",
                    this.state.user.name,
                    " "
                ),
                React.createElement("br", null),
                React.createElement(
                    "label",
                    null,
                    "ID: ",
                    this.state.user.id
                ),
                React.createElement("br", null),
                React.createElement(
                    "label",
                    null,
                    "Email: ",
                    this.state.user.email_address
                ),
                React.createElement("br", null),
                React.createElement(
                    "label",
                    null,
                    "Creation Date: ",
                    this.state.user.creation_date
                ),
                React.createElement("br", null),
                React.createElement(
                    "label",
                    null,
                    "Status: ",
                    this.state.user.status
                )
            ),
            this.state.user.id != 0 ? React.createElement(
                "form",
                { onSubmit: this.onSubmit },
                React.createElement(
                    "label",
                    null,
                    "please choose a status:",
                    React.createElement(
                        "select",
                        { value: this.state.status, onChange: this.handleChange },
                        React.createElement(
                            "option",
                            { value: "created" },
                            "Created"
                        ),
                        React.createElement(
                            "option",
                            { value: "active" },
                            "Active"
                        ),
                        React.createElement(
                            "option",
                            { value: "suspended" },
                            "Suspended"
                        ),
                        React.createElement(
                            "option",
                            { value: "deleted" },
                            "Deleted"
                        )
                    )
                ),
                React.createElement("input", { type: "submit", value: "Change Status" })
            ) : ''
        );
    }

}
//-------------------------------------------------------------------------------------

class UsersList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            users: this.props.usersList, // this is not working like that
            users_status: 'none',
            selected_users_by_status: [],
            selected_user_id: '',
            selected_user: '',
            warning_visable: false,
            is_status_change: false
        };

        this.handleChangeSelectedUser = this.handleChangeSelectedUser.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleChangeUserStatus = this.handleChangeUserStatus.bind(this);
        this.getAllUsersWithCurrStatus = this.getAllUsersWithCurrStatus.bind(this);
        //this.onStatusChange = this.onStatusChange.bind(this);
        this.renderUser = this.renderUser.bind(this);
        console.log("ON UserList ctor" + this.state.users);
    }

    onComponentMount() {
        // const selcted_users_arr = this.getAllUsersWithCurrStatus('active');
        // this.setState({selected_users_by_status : selcted_users_arr});

    }

    handleChangeUserStatus(event) {
        const selcted_users_arr = this.getAllUsersWithCurrStatus(event.target.value);
        this.setState({ users_status: event.target.value, selected_users_by_status: selcted_users_arr,
            selected_user_id: selcted_users_arr[0] != undefined ? selcted_users_arr[0].id : -1,
            selected_user: ''
        });
    }

    getAllUsersWithCurrStatus(status) {
        let selected_users_arr = [];
        for (let i = 0; i < this.props.usersList.length; i++) {
            if (this.props.usersList[i].status == status) {
                selected_users_arr.push(this.props.usersList[i]);
            }
        }
        return selected_users_arr;
    }

    handleChangeSelectedUser(event) {
        event.preventDefault();
        this.setState({ selected_user_id: event.target.value, warning_visable: false });
    }

    handleSubmit(event) {
        event.preventDefault();
        const user = this.props.usersList.find(user => user.id == this.state.selected_user_id);
        this.setState({ selected_user: user });
    }

    renderUser() {
        if (this.state.selected_user != '') {
            return React.createElement(
                "div",
                null,
                React.createElement(UserData, { user: this.state.selected_user, onStatusChange: this.props.handleChangeStatus })
            );
        } else {
            return '';
        }
    }

    // onStatusChange(user_id, user_status){
    //     if(this.props.handle_change_status){
    //         this.props.handleChangeStatus(user_id, user_status);
    //     }
    // }

    render() {
        return React.createElement(
            "div",
            null,
            React.createElement(
                "form",
                { onSubmit: this.handleSubmit },
                React.createElement(
                    "label",
                    null,
                    "please choose a status:",
                    React.createElement(
                        "select",
                        { value: this.state.users_status, onChange: this.handleChangeUserStatus },
                        React.createElement(
                            "option",
                            { value: "none", disabled: true, hidden: true },
                            "Select an Status"
                        ),
                        React.createElement(
                            "option",
                            { value: "created" },
                            "Created"
                        ),
                        React.createElement(
                            "option",
                            { value: "active" },
                            "Active"
                        ),
                        React.createElement(
                            "option",
                            { value: "suspended" },
                            "Suspended"
                        ),
                        React.createElement(
                            "option",
                            { value: "deleted" },
                            "Deleted"
                        )
                    )
                ),
                React.createElement(
                    "label",
                    null,
                    "Select a user: "
                ),
                React.createElement(
                    "select",
                    { value: this.state.selected_user_id, onChange: this.handleChangeSelectedUser },
                    this.state.selected_users_by_status.map((user, index) => {
                        return React.createElement(
                            "option",
                            { key: index, value: user.id },
                            user.name
                        );
                    })
                ),
                this.state.users_status != "none" && this.state.selected_user_id != -1 ? React.createElement("input", { type: "submit", value: "see details" }) : '',
                React.createElement(
                    "label",
                    { className: this.state.warning_visable ? "errorVisible" : "errorInvisible" },
                    "Please choose a user"
                )
            ),
            this.renderUser()
        );
    }
}

//-------------------------------------------------------------------------------------
class BroadcastMessage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            text_message: '',
            warning_visable: false
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event) {
        this.setState({ text_message: event.target.value, warning_visable: false });
    }

    handleSubmit(event) {
        event.preventDefault();
        if (this.state.text_message != '') {
            if (this.props.handle_send_message_to_all) {
                this.props.handle_send_message_to_all(this.state.text_message);
                this.setState({ text_message: '' });
            }
        } else {
            this.setState({ text_message: '', warning_visable: true });
        }
    }

    render() {
        return React.createElement(
            "form",
            { onSubmit: this.handleSubmit },
            React.createElement("textarea", { value: this.state.text_message, onChange: this.handleChange }),
            React.createElement("input", { type: "submit", value: "Send broadcast message" })
        );
    }
}
//-------------------------------------------------------------------------------------
class AdminPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            token: this.props.token,
            users: []

            //TODO: all handling functions
        };this.handle_change_status = this.handle_change_status.bind(this);
        this.handle_get_users = this.handle_get_users.bind(this);
        this.handle_send_message_to_all = this.handle_send_message_to_all.bind(this);
    }

    async componentDidMount() {
        await this.handle_get_users();
    }

    async handle_change_status(userID, newStatus) {
        const response = await fetch('http://localhost:2718/social_network/admin/users', { method: 'PUT',
            body: JSON.stringify({ id: userID, status: newStatus }),
            headers: { 'Content-Type': 'application/json', 'Authorization': this.state.token }
        });
        if (response.status == 200) {
            await this.handle_get_users();
            const text = await response.text();
            alert(text);
        } else {
            const err = await response.text();
            alert(err);
        }
    }

    async handle_send_message_to_all(message) {
        console.log("The token=", message);
        const response = await fetch('http://localhost:2718/social_network/admin/message', { method: 'POST',
            body: JSON.stringify({ text: message }),
            headers: { 'Content-Type': 'application/json', "Authorization": this.state.token }
        });
        if (response.status == 200) {
            alert((await response.text()));
        } else {
            const err = await response.text();
            alert(err);
        }
    }

    async handle_get_users() {
        const response = await fetch('http://localhost:2718/social_network/users', { method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': this.state.token }
        });
        if (response.status == 200) {
            const users_arr = await response.json();
            this.setState({ users: users_arr });
        } else {
            const err = await response.text();
            alert(err);
        }
    }

    render() {
        return React.createElement(
            "div",
            null,
            React.createElement(BroadcastMessage, { handle_send_message_to_all: this.handle_send_message_to_all }),
            React.createElement("br", null),
            React.createElement("br", null),
            React.createElement(UsersList, { usersList: this.state.users, handleChangeStatus: this.handle_change_status })
        );
    }
}