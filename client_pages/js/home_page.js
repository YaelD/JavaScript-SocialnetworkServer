
class Post extends React.Component {
	constructor(props) {
		super(props);
		//this.handle_click = this.handle_click.bind( this );
	}

	// handle_click()
	// {
	// 	if ( this.props.handle_delete )
	// 	  this.props.handle_delete( this.props.user.id );
	// }

	render() {
		return React.createElement(
			'div',
			{ className: 'post' },
			React.createElement(
				'span',
				null,
				'Send by: ',
				this.props.post.creator_name
			),
			React.createElement('br', null),
			React.createElement(
				'span',
				null,
				'At: ',
				this.props.post.creation_date
			),
			React.createElement('br', null),
			React.createElement('br', null),
			React.createElement(
				'span',
				null,
				this.props.post.message
			)
		);
	}
}

class Posts extends React.Component {
	constructor(props) {
		super(props);
		this.handle_get_posts = this.handle_get_posts.bind(this);
		this.state = { posts: [] };
	}

	async componentDidMount() //נצטרך לעשות את זה בעמוד של הפוסטים וההודעות
	{
		const posts = await this.handle_get_posts();
		this.update_list(posts);
	}

	// async fetch_posts()
	// {
	// 	const response = await fetch('/api/users');
	// 	if ( response.status != 200 )
	// 	  throw new Error( 'Error while fetching users');
	// 	const data = await response.json();
	// 	return data;
	// }

	async handle_get_posts() {
		const response = await fetch('http://localhost:2718/social_network/users/post', { method: 'GET',
			headers: { 'Content-Type': 'application/json', 'Authorization': '07c5546107af5a' }
		});
		if (response.status != 200) {
			throw new Error('Error while fetching posts');
		}
		const data = await response.json();
		return data;
	}

	update_list(posts) {
		this.setState({ posts: posts });
	}

	render() {
		return React.createElement(
			'div',
			null,
			this.state.posts.map((post, index) => {
				return React.createElement(Post, {
					handle_delete: this.handle_delete, post: post, key: index });
			})
		);
	}
}