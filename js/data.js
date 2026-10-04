"use strict";

/**
 * data.js
 * Provides the built-in flashcard deck collections with factual, original content.
 */

// Array of built-in decks with 12 cards each
const BUILT_IN_DECKS = [
  {
    id: "web-dev",
    name: "Web Development Basics",
    cards: [
      {
        id: "web-001",
        question: "What does HTML stand for?",
        answer: "HyperText Markup Language. It provides the standard structure and semantic meaning of web content.",
        category: "HTML"
      },
      {
        id: "web-002",
        question: "What are the four components of the CSS box model?",
        answer: "From inside to outside: content, padding, border, and margin.",
        category: "CSS"
      },
      {
        id: "web-003",
        question: "What is the Document Object Model (DOM)?",
        answer: "A tree-structured representation of an HTML document created by the browser, accessible via JavaScript.",
        category: "JavaScript"
      },
      {
        id: "web-004",
        question: "What is the key difference between let and const in JavaScript?",
        answer: "const declares variables that cannot be reassigned, while let permits reassignment. Both are block-scoped.",
        category: "JavaScript"
      },
      {
        id: "web-005",
        question: "What does CSS specificity determine?",
        answer: "Specificity decides which CSS style rule applies to an element when multiple conflicting selectors match.",
        category: "CSS"
      },
      {
        id: "web-006",
        question: "What is the purpose of the HTTP GET method?",
        answer: "It requests a representation of a specified resource from the server without modifying server state.",
        category: "Networking"
      },
      {
        id: "web-007",
        question: "What is an event listener in JavaScript?",
        answer: "A function attached to a DOM element that executes whenever a specific event (such as a click) occurs.",
        category: "JavaScript"
      },
      {
        id: "web-008",
        question: "What is the purpose of the viewport meta tag in HTML?",
        answer: "It configures the page dimensions and scaling behavior to render responsively across mobile screens.",
        category: "HTML"
      },
      {
        id: "web-009",
        question: "What does the defer attribute on a script tag do?",
        answer: "It downloads the script asynchronously and executes it in order after HTML document parsing is complete.",
        category: "HTML"
      },
      {
        id: "web-010",
        question: "What is localStorage in modern browsers?",
        answer: "A synchronous key-value storage API that persists string data across sessions without an expiration date.",
        category: "Browser APIs"
      },
      {
        id: "web-011",
        question: "What layout problem does CSS Flexbox solve?",
        answer: "It provides an efficient one-dimensional model for aligning and distributing space among items in a row or column.",
        category: "CSS"
      },
      {
        id: "web-012",
        question: "What is semantic HTML?",
        answer: "Using HTML tags that clearly convey their meaning and purpose to browsers and screen readers (e.g., <article>).",
        category: "HTML"
      }
    ]
  },
  {
    id: "human-biology",
    name: "Human Biology Basics",
    cards: [
      {
        id: "bio-001",
        question: "What is the primary role of red blood cells (erythrocytes)?",
        answer: "To deliver oxygen from the lungs to body tissues and carry carbon dioxide back to the lungs.",
        category: "Circulatory System"
      },
      {
        id: "bio-002",
        question: "Which organ filters blood to produce urine?",
        answer: "The kidneys, which remove metabolic waste products and help maintain fluid and electrolyte balance.",
        category: "Excretory System"
      },
      {
        id: "bio-003",
        question: "What is the main function of mitochondria in human cells?",
        answer: "Mitochondria produce most of the cell's adenosine triphosphate (ATP), the primary biochemical energy source.",
        category: "Cell Biology"
      },
      {
        id: "bio-004",
        question: "Which nervous system branch controls the 'fight-or-flight' response?",
        answer: "The sympathetic nervous system, which accelerates heart rate and increases physiological alertness.",
        category: "Nervous System"
      },
      {
        id: "bio-005",
        question: "What is the primary function of the hormone insulin?",
        answer: "Produced by the pancreas, insulin enables body cells to absorb glucose from the bloodstream for energy.",
        category: "Endocrine System"
      },
      {
        id: "bio-006",
        question: "Where does the majority of nutrient absorption occur in the body?",
        answer: "In the small intestine, primarily through the microscopic villi lining the jejunum and ileum.",
        category: "Digestive System"
      },
      {
        id: "bio-007",
        question: "What is the role of blood platelets (thrombocytes)?",
        answer: "Platelets adhere to damaged blood vessel walls and form clots to halt bleeding.",
        category: "Circulatory System"
      },
      {
        id: "bio-008",
        question: "Which blood vessels carry oxygen-rich blood away from the heart?",
        answer: "Arteries carry blood away from the heart, with the aorta being the largest systemic artery.",
        category: "Circulatory System"
      },
      {
        id: "bio-009",
        question: "What is homeostasis in human physiology?",
        answer: "The active biological process of maintaining a stable internal environment despite external fluctuations.",
        category: "Physiology"
      },
      {
        id: "bio-010",
        question: "What is the physiological role of pulmonary alveoli?",
        answer: "Microscopic air sacs where gas exchange occurs, transferring oxygen into blood and receiving CO2 to exhale.",
        category: "Respiratory System"
      },
      {
        id: "bio-011",
        question: "What anatomical structure connects skeletal muscle to bone?",
        answer: "Tendons, which are strong bands of dense fibrous connective tissue.",
        category: "Musculoskeletal"
      },
      {
        id: "bio-012",
        question: "Which type of white blood cells produces antibodies?",
        answer: "B lymphocytes (B cells), which recognize foreign antigens and release targeted antibodies.",
        category: "Immune System"
      }
    ]
  },
  {
    id: "computer-science",
    name: "Computer Science Basics",
    cards: [
      {
        id: "cs-001",
        question: "What is the average time complexity of finding a key in a hash table?",
        answer: "O(1) constant time, assuming a good hash function that distributes keys evenly.",
        category: "Data Structures"
      },
      {
        id: "cs-002",
        question: "What order principle governs the operation of a Stack?",
        answer: "Last-In, First-Out (LIFO), meaning the most recently pushed element is the first one popped.",
        category: "Data Structures"
      },
      {
        id: "cs-003",
        question: "What is the worst-case time complexity of QuickSort?",
        answer: "O(n²), which happens when pivots repeatedly partition the input into severely unbalanced subarrays.",
        category: "Algorithms"
      },
      {
        id: "cs-004",
        question: "What is the main distinction between a process and a thread?",
        answer: "A process possesses its own isolated virtual memory space, whereas threads within a process share memory.",
        category: "Operating Systems"
      },
      {
        id: "cs-005",
        question: "What does the Domain Name System (DNS) do?",
        answer: "DNS translates human-readable domain names (e.g., example.com) into numerical IP addresses.",
        category: "Networking"
      },
      {
        id: "cs-006",
        question: "What is the time complexity of binary search on a sorted array?",
        answer: "O(log n) time, because the search space is divided in half with every comparison.",
        category: "Algorithms"
      },
      {
        id: "cs-007",
        question: "What does volatile memory mean in the context of RAM?",
        answer: "Volatile memory requires continuous electrical power; all stored data is lost when power is turned off.",
        category: "Computer Architecture"
      },
      {
        id: "cs-008",
        question: "What three packets make up the TCP connection handshake?",
        answer: "SYN (synchronize), SYN-ACK (synchronize-acknowledge), and ACK (acknowledge).",
        category: "Networking"
      },
      {
        id: "cs-009",
        question: "What is a deadlock in concurrent programming?",
        answer: "A situation where multiple processes are permanently blocked because each holds a lock the other needs.",
        category: "Operating Systems"
      },
      {
        id: "cs-010",
        question: "What is recursion in computer programming?",
        answer: "A programming technique where a function solves a problem by calling a smaller instance of itself.",
        category: "Programming"
      },
      {
        id: "cs-011",
        question: "How many bits are in an IPv6 address compared to an IPv4 address?",
        answer: "An IPv6 address contains 128 bits (16 bytes), whereas an IPv4 address contains 32 bits (4 bytes).",
        category: "Networking"
      },
      {
        id: "cs-012",
        question: "What is Big O notation used to measure?",
        answer: "It describes the upper-bound limiting behavior of an algorithm's runtime or space as input size increases.",
        category: "Algorithms"
      }
    ]
  }
];
