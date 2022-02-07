class HomePage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            HOME_PAGE: "home",
            MESSAGE_PAGE: "message",
            ADMIN_PAGE: "admin",
            ABOUT_PAGE: "about",
            currPage: "home",
            token: props.token,
            userDetails: props.user,
            numOfPosts: 0,
            newPostNotification: '',
            isNewPosts: false,
            postsIntervalID: 0,
            numOfMessages: 0,
            newMessageNotification: '',
            isNewMessages: false,
            messagesIntervalID: 0,
            showAbout: false
        };
        this.renderPage = this.renderPage.bind(this);
        this.handleHome = this.handleHome.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleAdmin = this.handleAdmin.bind(this);
        this.handleAbout = this.handleAbout.bind(this);
        this.renderAdmin = this.renderAdmin.bind(this);
        this.renderMessages = this.renderMessages.bind(this);
        this.renderPosts = this.renderPosts.bind(this);
        this.renderAbout = this.renderAbout.bind(this);
        this.getNumOfPosts = this.getNumOfPosts.bind(this);
        this.getNumOfMessages = this.getNumOfMessages.bind(this);
        this.calcNumOfPosts = this.calcNumOfPosts.bind(this);
        this.hidePostsNotification = this.hidePostsNotification.bind(this);
        this.calcNumOfMessages = this.calcNumOfMessages.bind(this);
        this.hideMessagesNotification = this.hideMessagesNotification.bind(this);
        this.handleLogout = this.handleLogout.bind(this);
    }

    async componentDidMount() {
        this.setState({ numOfPosts: await this.getNumOfPosts() });
        this.setState({ numOfMessages: await this.getNumOfMessages() });
        const postInterval = setInterval(this.calcNumOfPosts, 3000);
        const messagesInterval = setInterval(this.calcNumOfMessages, 3000);
        this.setState({
            postsIntervalID: postInterval,
            messagesIntervalID: messagesInterval
        });
    }

    async calcNumOfPosts() {
        const serverNumOfPosts = await this.getNumOfPosts();
        if (serverNumOfPosts > this.state.numOfPosts) {
            this.setState({
                newPostNotification: "There are new posts!",
                numOfPosts: serverNumOfPosts
            });
        }
    }

    async calcNumOfMessages() {
        const serverNumOfMessages = await this.getNumOfMessages();
        console.log("Num Of Messages: " + serverNumOfMessages + "  " + this.state.numOfMessages);
        if (serverNumOfMessages > this.state.numOfMessages) {
            this.setState({
                newMessageNotification: "You have new Messages!",
                numOfMessages: serverNumOfMessages
            });
        }
    }

    hidePostsNotification() {
        this.setState({
            newPostNotification: "",
            numOfPosts: this.state.numOfPosts + 1
        });
    }

    hideMessagesNotification() {
        this.setState({
            newMessageNotification: "",
            numOfMessages: this.state.numOfMessages
        });
    }

    componentWillUnmount() {
        clearInterval(this.state.messagesIntervalID);
        clearInterval(this.state.postsIntervalID);
    }

    async getNumOfPosts() {
        const response = await fetch('http://localhost:2718/social_network/users/post', { method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': this.state.token }
        });
        if (response.status != 200) {
            throw new Error('Error while fetching posts');
        }
        const data = await response.json();
        return data.length;
    }

    async getNumOfMessages() {
        const response = await fetch('http://localhost:2718/social_network/users/message', { method: 'GET',
            headers: { 'Content-Type': 'application/json', 'Authorization': this.state.token }
        });
        if (response.status != 200) {
            throw new Error('Error while fetching messages');
        }
        const data = await response.json();
        return data.length;
    }

    renderPage(page) {
        if (page == this.state.MESSAGE_PAGE) {
            return this.renderMessages();
        } else if (page == this.state.HOME_PAGE) {
            return this.renderPosts();
        } else if (page == this.state.ADMIN_PAGE) {
            return this.renderAdmin();
        } else if (page == this.state.ABOUT_PAGE) {
            return this.renderAbout();
        }
    }

    handleHome() {
        this.setState({
            currPage: this.state.HOME_PAGE,
            newPostNotification: '',
            isNewPosts: !this.state.isNewPosts
        });
    }
    handleMessage() {
        this.setState({
            currPage: this.state.MESSAGE_PAGE,
            newMessageNotification: '',
            isNewMessages: !this.state.isNewMessages

        });
    }

    handleAdmin() {
        this.setState({ currPage: this.state.ADMIN_PAGE });
    }

    renderAdmin() {
        return React.createElement(AdminPage, { token: this.state.token });
    }

    renderMessages() {
        return React.createElement(MessagePage, { userId: this.state.userDetails.id, token: this.state.token, onHide: this.hideMessagesNotification, isRefreshed: this.state.isNewMessages });
    }

    renderPosts() {
        return React.createElement(
            PostPage,
            { token: this.state.token, onHide: this.hidePostsNotification, isRefreshed: this.state.isNewPosts },
            " "
        );
    }

    renderAbout() {
        return React.createElement(AboutWindow, null);
    }

    handleAbout() {
        this.setState({ currPage: this.state.ABOUT_PAGE });
    }

    handleLogout() {
        if (confirm("Are sure you want to logout?")) {
            this.props.logOut();
        }
    }

    render() {
        return React.createElement(
            "div",
            { className: "homePageContainer" },
            React.createElement(
                "div",
                { className: "topMenu" },
                React.createElement(
                    "button",
                    { onClick: this.handleHome },
                    " Home"
                ),
                React.createElement(
                    "button",
                    { onClick: this.handleMessage },
                    " Messages"
                ),
                this.state.userDetails.id == 0 ? React.createElement(
                    "button",
                    { onClick: this.handleAdmin },
                    " Admin"
                ) : '',
                React.createElement(
                    "button",
                    { onClick: this.handleAbout },
                    " About"
                ),
                React.createElement(
                    "button",
                    { onClick: this.handleLogout },
                    " LogOut"
                ),
                this.state.showAbout ? React.createElement(AboutWindow, null) : '',
                React.createElement(
                    "div",
                    { className: "notifications" },
                    React.createElement(
                        "label",
                        { onClick: this.handleHome },
                        this.state.newPostNotification
                    ),
                    React.createElement("br", null),
                    React.createElement(
                        "label",
                        { onClick: this.handleMessage },
                        this.state.newMessageNotification
                    )
                )
            ),
            React.createElement(
                "div",
                { className: "page" },
                this.renderPage(this.state.currPage)
            )
        );
    }
}

class AboutWindow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {

        return React.createElement(
            "div",
            null,
            "This is our app ",
            React.createElement("br", null),
            " Hope you will enjoy it!"
        );
    }
}