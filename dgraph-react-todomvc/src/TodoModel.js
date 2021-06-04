
import * as dgraph from 'dgraph-js-http'
export default class TodoModel {
  constructor() {
    
	const clientStub = new dgraph.DgraphClientStub("http://localhost:8080")
   this.dgraph = new dgraph.DgraphClient(clientStub)
   	this.todos = []
    this.fetchAndInform()

  }

	onChanges = []

	subscribe = onChange =>
		this.onChanges.push(onChange)

	inform = () => {
		
		this.onChanges.forEach(cb => cb())
	}

	addTodo = title => {
		this.todos = this.todos.concat({
			uid:123,
			title: title,
			completed: false,
		})

		this.inform()
	}

	//toggle()每次点击时切换要调用的函数。 如果点击了一个匹配的元素，
	// 则触发指定的第一个函数，当再次点击同一元素时，则触发指定的第二个函数。
	// 随后的每次点击都重复对这两个函数的轮番调用。
	// 注：可以使用unbind("click")来删除。
	async toggleAll(completed) {
		try {
		  const toggleJson = this.todos
			  .map(({ uid }) => ({ uid, completed }))
	
			
		  await this.dgraph.newTxn().mutate({
			setJson: toggleJson,
			commitNow: true,
		  })
		} catch (error) {
		  console.error('Network error', error)
		} finally {
		  this.fetchAndInform()
		}
	}

	//toggle single ite,
	async toggle(todoToToggle) {
		try {
		  await this.dgraph.newTxn().mutate({
			setJson: {
			  uid: todoToToggle.uid,
			  completed: !todoToToggle.completed,
			},
			commitNow: true,
		  })
		} catch (error) {
		  console.error('Network error', error)
		} finally {
		  this.fetchAndInform()
		}
	}
	

		

	
	//helper method, call fetchTodos 当web app loaded
	async fetchAndInform() {
		this.todos = await this.fetchTodos()
		//Object.freeze() 方法可以冻结一个对象。一个被冻结的对象再也不能被修改；
		// 冻结了一个对象则不能向这个对象添加新的属性，不能删除已有属性，
		// 不能修改该对象已有属性的可枚举性、可配置性、可写性，以及不能修改已有属性的值。
		// 此外，冻结一个对象后该对象的原型也不能被修改。freeze() 返回和传入的参数相同的对象。
		this.todos.forEach(Object.freeze)
    	Object.freeze(this.todos)
		this.inform()
	  }
	//获取dgraph data
	async fetchTodos() {
		const query = `{
		  todos(func: has(is_todo))
		  {
			uid
			title
			completed
		  }
		}`
		const res = await this.dgraph.newTxn().query(query)
		return res.data.todos || []
	  }

	  //create new to-do items in Dgraph
	  //创建transaction 与 mutation
	  async addTodo(title) {
		try {
			//创建item
		  const res = await this.dgraph.newTxn().mutate({
			setJson: {
			//alias, uid of a node is refered to uid.newTodo; auto-increment
			  uid: "_:newTodo",
			  is_todo: true,
			  title,
			  completed: false,
			},
			//informs Dgraph这个transaction不会再修改data，可以commit了
			//在生产环境/更复杂的操作时一般直接set false或者忽略它，之后手动调用commit()
			commitNow: true,
		  })
	
		  console.info('Created new to-do with uid', res.data.uids.newTodo)
		} catch (error) {
		  alert('Database write failed!')
		  console.error('Network error', error)
		} finally {
			//reload
		  this.fetchAndInform()
		}
	  }
	  //delet nodes in Dgraph
	async destroy(todo) {
		try {
		  await this.dgraph.newTxn().mutate({
			deleteJson: {
			  uid: todo.uid
			},
			commitNow: true,
		  })
		} catch (error) {
		  alert('Database write failed!')
		  console.error('Network error', error)
		} finally {
		  this.fetchAndInform()
		}
	}

	async clearCompleted() {
		try {
			//delete多个nodes
		  const uidsToDelete = this.todos
			  .filter(({ completed }) => completed)
			  .map(({ uid }) => ({ uid }))
	
		  await this.dgraph.newTxn().mutate({
			deleteJson: uidsToDelete,
			commitNow: true,
		  })
		} catch (error) {
		  alert('Database write failed!')
		  console.error('Network error', error)
		} finally {
		  this.fetchAndInform()
		}
	}

	//通过另一个transaction修改一个node
	async save(todoToSave, newTitle) {
		try {
		  await this.dgraph.newTxn().mutate({
			setJson: {
			  uid: todoToSave.uid,
			  //Dgraph update无需pass整个object，返回最新的title，其它的predicates值不变
			  title: newTitle,
			},
			commitNow: true,
		  })
		} catch (error) {
		  console.error('Network error', error)
		} finally {
		  this.fetchAndInform()
		}
	}
	
}