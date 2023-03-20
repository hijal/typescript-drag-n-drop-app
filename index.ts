// Import stylesheets
import './style.css';
/**
 * state listener
 */
type Listener<T> = (items: T[]) => void;

/**
 * user input tuple
 */
type UserInput = [string, string, number] | void;

/**
 * project type tuple
 */
type ProjectTypes = 'active' | 'finished';

/**
 * project status
 */
enum ProjectStatus {
  Active,
  Finished,
}

/**
 * validation interface
 */
interface Validatable {
  value: string | number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public people: number,
    public status: ProjectStatus
  ) {}
}

class State<T> {
  protected listeners: Listener<T>[] = [];

  addListener(listenerFn: Listener<T>) {
    this.listeners.push(listenerFn);
  }
}

/**
 * singleton pattern for project states
 */
class ProjectState extends State<Project> {
  private projects: Project[] = [];
  private static instance: ProjectState;

  private constructor() {
    super();
  }

  static getInstance() {
    if (this.instance) {
      return this.instance;
    }
    this.instance = new ProjectState();
    return this.instance;
  }

  addProject(title: string, description: string, people: number) {
    const id = (Math.random() + 1).toString(36).substring(2);
    const newProject = new Project(
      id,
      title,
      description,
      people,
      ProjectStatus.Active
    );
    this.projects.push(newProject);

    for (const listenerFn of this.listeners) {
      listenerFn(this.projects.slice());
    }
  }
}

const projectState = ProjectState.getInstance();

/**
 * Auto binding decorator
 */
function Autobinding(_: any, _1: string, desc: PropertyDescriptor) {
  const originalMethod = desc.value;

  const adjustedDescriptor: PropertyDescriptor = {
    configurable: true,
    enumerable: false,
    get() {
      const boundFn = originalMethod.bind(this);
      return boundFn;
    },
  };

  return adjustedDescriptor;
}

/**
 * validation function
 */
function validate(validatableInput: Validatable) {
  let isValid = true;

  if (validatableInput.required) {
    isValid = isValid && validatableInput.value.toString().trim().length !== 0;
  }

  if (
    validatableInput.minLength != null &&
    typeof validatableInput.value === 'string'
  ) {
    isValid =
      isValid && validatableInput.value.length >= validatableInput.minLength;
  }

  if (
    validatableInput.maxLength != null &&
    typeof validatableInput.value === 'string'
  ) {
    isValid =
      isValid && validatableInput.value.length <= validatableInput.maxLength;
  }

  if (
    validatableInput.min != null &&
    typeof validatableInput.value === 'number'
  ) {
    isValid = isValid && validatableInput.value >= validatableInput.min;
  }

  if (
    validatableInput.max != null &&
    typeof validatableInput.value === 'number'
  ) {
    isValid = isValid && validatableInput.value <= validatableInput.max;
  }

  return isValid;
}

/**
 * Base Component class
 */

abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateElement: HTMLTemplateElement;
  hostElement: T;
  element: U;

  constructor(
    templateId: string,
    hostElementId: string,
    insertAtStart: boolean,
    newElementId?: string
  ) {
    this.templateElement = document.getElementById(
      templateId
    )! as HTMLTemplateElement;
    this.hostElement = document.getElementById(hostElementId)! as T;

    const importedNode = document.importNode(
      this.templateElement.content,
      true
    );
    this.element = importedNode.firstElementChild as U;
    if (newElementId) {
      this.element.id = newElementId;
    }

    this.attach(insertAtStart);
  }

  private attach(insertAtStart: boolean) {
    this.hostElement.insertAdjacentElement(
      insertAtStart ? 'afterbegin' : 'beforeend',
      this.element
    );
  }

  abstract configure(): void;
  abstract renderContent(): void;
}

/**
 * Project item class
 */

class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> {
  private project: Project;

  get persons() {
    if (this.project.people === 1) {
      return '1 person';
    }
    return `${this.project.people} persons`;
  }

  constructor(hostId: string, project: Project) {
    super('single-project', hostId, false, project.id);
    this.project = project;

    this.configure();
    this.renderContent();
  }

  configure(): void {}
  renderContent(): void {
    (this.element.querySelector('h2')! as HTMLElement).textContent =
      this.project.title;

    (this.element.querySelector('h3')! as HTMLElement).textContent =
      this.persons + ' assigned';

    (this.element.querySelector('p')! as HTMLElement).textContent =
      this.project.description;
  }
}

/**
 * Render the project list base on it's type
 */
class ProjectList extends Component<HTMLDivElement, HTMLElement> {
  assignedProjects: Project[] = [];

  constructor(private type: ProjectTypes) {
    super('project-list', 'app', false, `${type}-projects`);

    this.renderContent();
    this.configure();
  }

  configure(): void {
    projectState.addListener((projects: Project[]) => {
      const relevantProjects = projects.filter((project) => {
        if (this.type === 'active') {
          return project.status === ProjectStatus.Active;
        }
        return project.status === ProjectStatus.Finished;
      });
      this.assignedProjects = relevantProjects;
      this.renderProjects();
    });
  }

  renderContent() {
    const listId = `${this.type}-projects-list`;
    this.element.querySelector('ul')!.id = listId;
    this.element.querySelector(
      'h2'
    )!.textContent = `${this.type.toUpperCase()} PROJECTS`;
  }

  private renderProjects() {
    const listEl = document.getElementById(
      `${this.type}-projects-list`
    )! as HTMLUListElement;

    listEl.innerHTML = '';

    for (const item of this.assignedProjects) {
      new ProjectItem(this.element.querySelector('ul')!.id, item);
    }
  }
}

/**
 * render and validation user input class
 */

class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
  titleInput: HTMLInputElement;
  descriptionInput: HTMLInputElement;
  peopleInput: HTMLInputElement;

  constructor() {
    super('project-input', 'app', true, 'user-input');

    this.titleInput = this.element.querySelector('#title')! as HTMLInputElement;
    this.descriptionInput = this.element.querySelector(
      '#description'
    )! as HTMLInputElement;
    this.peopleInput = this.element.querySelector(
      '#people'
    )! as HTMLInputElement;

    this.renderContent();
    this.configure();
  }

  configure() {
    this.element.addEventListener('submit', this.submitHandler);
  }

  renderContent(): void {}

  private getUserInput(): UserInput {
    const title = this.titleInput.value;
    const description = this.descriptionInput.value;
    const people = Number(this.peopleInput.value);

    const isTitleValid: Validatable = {
      value: title,
      required: true,
      minLength: 5,
    };

    const isDescriptionValid: Validatable = {
      value: description,
      required: true,
      minLength: 10,
    };

    const isPeopleValid: Validatable = {
      value: people,
      required: true,
      min: 1,
      max: 5,
    };

    if (
      !validate(isTitleValid) ||
      !validate(isDescriptionValid) ||
      !validate(isPeopleValid)
    ) {
      alert('Invalid input, please try again with valid input');
      return;
    }
    return [title, description, people];
  }

  @Autobinding
  private submitHandler(e: Event) {
    e.preventDefault();

    const userEnteredValues = this.getUserInput();

    if (Array.isArray(userEnteredValues)) {
      const [title, description, people] = userEnteredValues;
      projectState.addProject(title, description, people);
      this.resetForm();
    }
  }

  private resetForm() {
    this.titleInput.value = '';
    this.descriptionInput.value = '';
    this.peopleInput.value = '';
  }
}

const projectInput = new ProjectInput();
console.log(projectInput);

const activeProjects = new ProjectList('active');
const finishedProjects = new ProjectList('finished');
console.log(activeProjects);
console.log(finishedProjects);
