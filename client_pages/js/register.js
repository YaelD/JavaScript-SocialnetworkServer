class Register extends React.Component {

  constructor(props) {
    super(props);
    this.state = { email: '', password: '', name: '', warning_visable: false };

    this.handleChangeEmail = this.handleChangeEmail.bind(this);
    this.handleChangePassword = this.handleChangePassword.bind(this);
    this.handleChangeName = this.handleChangeName.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.checkValidation = this.checkValidation.bind(this);
  }

  handleChangeName(event) {
    this.update_state(this.state.email, this.state.password, event.target.value);
  }

  handleChangeEmail(event) {
    this.update_state(event.target.value, this.state.password, this.state.name);
  }

  handleChangePassword(event) {
    this.update_state(this.state.email, event.target.value, this.state.name);
  }

  async handleSubmit(event) {
    event.preventDefault();
    if (this.checkValidation()) {
      this.update_state(this.state.email, this.state.password, this.state.name, false);
      this.props.onRegister(this.state.name, this.state.email, this.state.password);
    } else {
      this.update_state(this.state.email, this.state.password, this.state.name, true);
    }
  }

  update_state(email, password, name, wranning_visible) {
    this.setState({ email: email, password: password, name: name, warning_visable: wranning_visible });
  }

  checkValidation() {
    console.log("State=", this.state);
    if (this.state.email != '' && this.state.name != '' && this.state.password != '') {
      return true;
    }
    return false;
  }

  render() {
    return React.createElement(
      'div',
      null,
      React.createElement(
        'form',
        { onSubmit: this.handleSubmit },
        React.createElement('br', null),
        React.createElement(
          'label',
          null,
          'Full name:',
          React.createElement('input', { type: 'text', value: this.state.name, onChange: this.handleChangeName })
        ),
        React.createElement('br', null),
        React.createElement('br', null),
        React.createElement(
          'label',
          null,
          'Email:',
          React.createElement('input', { type: 'email', value: this.state.email, onChange: this.handleChangeEmail })
        ),
        React.createElement('br', null),
        React.createElement('br', null),
        React.createElement(
          'label',
          null,
          'Password:',
          React.createElement('input', { type: 'password', value: this.state.password, onChange: this.handleChangePassword })
        ),
        React.createElement('br', null),
        React.createElement('br', null),
        React.createElement('input', { type: 'submit', value: 'Register' })
      ),
      React.createElement(
        'label',
        { className: this.state.warning_visable ? "errorVisible" : "errorInvisible" },
        'Error! You should fill all the fields'
      )
    );
  }
}