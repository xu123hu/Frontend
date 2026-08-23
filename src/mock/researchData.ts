import type {
  ActivityItem, DashboardData, EducationAnalysis, EvidenceItem, LeanBuildStatus,
  LeanFile, LeanGoal, LiteratureCollection, Paper, ProjectMember, ProjectTask,
  ResearchProject, ResearchRun, ReviewFinding, ReviewSubmission, VerifyCapability,
  VerifyResult, WritingProject,
} from '@/types/research'

const iso = (d: Date = new Date()) => d.toISOString()
const daysAgo = (n: number) => new Date(Date.now() - n * 86400e3).toISOString()
const hoursAgo = (n: number) => new Date(Date.now() - n * 3600e3).toISOString()

// ===== 项目数据 =====
const PROJECTS: ResearchProject[] = [
  {
    id: 'proj-gnn',
    name: 'GNN 路径规划优化研究',
    description: '基于图神经网络的城市道路网络路径规划算法优化，探索注意力机制在动态路网中的应用效果。',
    tags: ['GNN', '路径规划', '深度学习', '城市路网'],
    progress: 68,
    status: 'active',
    memberCount: 4,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(2),
    researchQuestion: '注意力增强的 GNN 模型能否在动态路网中显著提升路径规划效率与准确性？',
    hypotheses: [
      '引入多头注意力机制可提升 GNN 对路网拓扑变化的感知能力',
      '动态边权重更新策略优于静态权重在实时路径规划中的表现',
    ],
  },
  {
    id: 'proj-edu',
    name: '教育数据跨端协作分析',
    description: '多平台学习行为数据融合与跨端协作学习效果分析，构建统一学情画像。',
    tags: ['教育数据', '跨端协作', '学情分析', '数据融合'],
    progress: 42,
    status: 'active',
    memberCount: 6,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(1),
    researchQuestion: '跨端学习行为数据的融合能否提升学习路径推荐的精准度？',
    hypotheses: [
      '多源数据融合后的学情画像维度更丰富，推荐准确率提升 15% 以上',
    ],
  },
  {
    id: 'proj-adaptive',
    name: '自适应学习路径推荐算法',
    description: '基于知识图谱与强化学习的个性化学习路径推荐系统研究。',
    tags: ['自适应学习', '强化学习', '知识图谱', '推荐系统'],
    progress: 95,
    status: 'active',
    memberCount: 3,
    createdAt: daysAgo(120),
    updatedAt: hoursAgo(6),
    researchQuestion: '深度强化学习结合知识图谱能否生成更优的个性化学习路径？',
    hypotheses: [
      'DQN 算法在知识图谱路径搜索中收敛速度优于传统 A* 算法',
      '引入课程学习策略可降低强化学习探索成本',
    ],
  },
]

const PROJECT_MEMBERS: Record<string, ProjectMember[]> = {
  'proj-gnn': [
    { id: 'm1', name: '张明远', role: 'PI / 项目负责人', avatar: '' },
    { id: 'm2', name: '李思涵', role: '算法工程师' },
    { id: 'm3', name: '王浩然', role: '数据工程师' },
    { id: 'm4', name: '陈雨桐', role: '研究助理' },
  ],
  'proj-edu': [
    { id: 'm1', name: '张明远', role: 'PI / 项目负责人' },
    { id: 'm5', name: '刘博文', role: '教育数据科学家' },
    { id: 'm6', name: '赵欣怡', role: '统计分析师' },
    { id: 'm7', name: '孙嘉伟', role: '前端工程师' },
    { id: 'm8', name: '周晓燕', role: '教育学顾问' },
    { id: 'm4', name: '陈雨桐', role: '研究助理' },
  ],
  'proj-adaptive': [
    { id: 'm9', name: '黄子轩', role: 'PI / 项目负责人' },
    { id: 'm2', name: '李思涵', role: '算法工程师' },
    { id: 'm10', name: '林诗涵', role: '研究助理' },
  ],
}

const PROJECT_TASKS: Record<string, ProjectTask[]> = {
  'proj-gnn': [
    { id: 't1', title: '路网数据采集与预处理', status: 'done', assignee: '王浩然', priority: 'high' },
    { id: 't2', title: '基线模型搭建（GAT/GCN）', status: 'done', assignee: '李思涵', priority: 'high' },
    { id: 't3', title: '注意力机制模块设计', status: 'in_progress', assignee: '李思涵', priority: 'high' },
    { id: 't4', title: '动态边权重策略实现', status: 'todo', assignee: '陈雨桐', priority: 'medium' },
    { id: 't5', title: '对比实验与消融研究', status: 'todo', assignee: '张明远', priority: 'high' },
    { id: 't6', title: '论文初稿撰写', status: 'todo', priority: 'medium' },
  ],
  'proj-edu': [
    { id: 't7', title: '数据隐私合规审查', status: 'done', assignee: '刘博文', priority: 'high' },
    { id: 't8', title: '多源数据对齐方案', status: 'in_progress', assignee: '赵欣怡', priority: 'high' },
    { id: 't9', title: '统一学情画像模型', status: 'todo', assignee: '刘博文', priority: 'high' },
    { id: 't10', title: '跨端推荐实验设计', status: 'todo', assignee: '张明远', priority: 'medium' },
  ],
  'proj-adaptive': [
    { id: 't11', title: '知识图谱构建', status: 'done', assignee: '林诗涵', priority: 'high' },
    { id: 't12', title: 'DQN 推荐算法实现', status: 'done', assignee: '李思涵', priority: 'high' },
    { id: 't13', title: '课程学习策略集成', status: 'done', assignee: '黄子轩', priority: 'medium' },
    { id: 't14', title: '大规模 A/B 测试', status: 'in_progress', assignee: '李思涵', priority: 'high' },
    { id: 't15', title: '结果分析与论文撰写', status: 'todo', assignee: '黄子轩', priority: 'high' },
  ],
}

// ===== 文献数据 =====
const PAPERS: Paper[] = [
  {
    id: 'p1',
    title: 'Graph Attention Networks for Traffic Flow Prediction in Urban Road Networks',
    authors: ['Zhang, W.', 'Li, Y.', 'Wang, H.'],
    venue: 'IEEE Transactions on Intelligent Transportation Systems',
    year: 2024,
    abstract: '本文提出一种基于图注意力网络（GAT）的交通流预测方法，通过多头注意力机制捕捉路网中复杂的空间依赖关系。在真实城市数据集上的实验表明，该方法在预测精度上优于现有基线模型。',
    tags: ['GNN', 'GAT', '交通预测', '路网'],
    citations: 156,
    readStatus: 'read',
    addedAt: daysAgo(30),
    hasEvidence: true,
  },
  {
    id: 'p2',
    title: 'Adaptive Path Planning Using Deep Reinforcement Learning on Dynamic Graphs',
    authors: ['Chen, Y.', 'Liu, B.'],
    venue: 'NeurIPS',
    year: 2023,
    abstract: '我们提出了一种在动态图结构上使用深度强化学习进行自适应路径规划的框架。该方法能够实时响应图结构变化，在多个基准测试中展现出优异的性能。',
    tags: ['强化学习', '路径规划', '动态图'],
    citations: 243,
    readStatus: 'read',
    addedAt: daysAgo(45),
    hasEvidence: true,
  },
  {
    id: 'p3',
    title: 'Knowledge Graph-Based Personalized Learning Path Recommendation: A Survey',
    authors: ['Huang, Z.', 'Shi, M.'],
    venue: 'ACM Computing Surveys',
    year: 2024,
    abstract: '本文综述了基于知识图谱的个性化学习路径推荐领域的最新进展，系统梳理了现有方法的分类、评估指标和挑战，并指出了未来研究方向。',
    tags: ['知识图谱', '推荐系统', '自适应学习', '综述'],
    citations: 89,
    readStatus: 'reading',
    addedAt: daysAgo(15),
    hasEvidence: true,
  },
  {
    id: 'p4',
    title: 'Cross-Platform Learning Analytics: Data Integration Challenges and Solutions',
    authors: ['Liu, B.', 'Zhao, X.', 'Zhou, X.'],
    venue: 'Journal of Educational Data Mining',
    year: 2024,
    abstract: '针对多平台学习数据的异构性问题，本文提出了一种统一的数据集成框架，结合语义对齐和特征迁移技术，实现了跨平台学情的有效融合。',
    tags: ['学习分析', '数据融合', '跨平台'],
    citations: 34,
    readStatus: 'reading',
    addedAt: daysAgo(10),
    hasEvidence: false,
  },
  {
    id: 'p5',
    title: 'Spatial-Temporal Graph Convolutional Networks: A Comprehensive Review',
    authors: ['Wu, Z.', 'Pan, S.', 'Long, G.'],
    venue: 'IEEE Transactions on Neural Networks and Learning Systems',
    year: 2023,
    abstract: '本文全面综述了时空图卷积网络的发展历程，从模型架构、应用领域到训练策略进行了系统总结，并讨论了未来发展趋势。',
    tags: ['GCN', 'ST-GCN', '时空图', '综述'],
    citations: 567,
    readStatus: 'read',
    addedAt: daysAgo(60),
    hasEvidence: true,
  },
  {
    id: 'p6',
    title: 'Curriculum Learning for Deep Reinforcement Learning Agents',
    authors: ['Narvekar, S.', 'Peng, B.', 'Stone, P.'],
    venue: 'Journal of Machine Learning Research',
    year: 2023,
    abstract: '课程学习通过按难度递增的顺序组织训练任务，能够显著加速强化学习智能体的收敛。本文系统研究了课程设计策略及其在 DRL 中的应用效果。',
    tags: ['课程学习', '强化学习', 'DRL'],
    citations: 198,
    readStatus: 'read',
    addedAt: daysAgo(50),
    hasEvidence: true,
  },
  {
    id: 'p7',
    title: 'Graph Neural Networks for Recommender Systems: Architectures and Applications',
    authors: ['Wang, X.', 'He, X.'],
    venue: 'SIGIR',
    year: 2023,
    abstract: '本文系统介绍了图神经网络在推荐系统中的应用，包括协同过滤、序列推荐和社交推荐等场景，并对比了不同 GNN 架构的优劣。',
    tags: ['GNN', '推荐系统', '协同过滤'],
    citations: 312,
    readStatus: 'read',
    addedAt: daysAgo(40),
    hasEvidence: true,
  },
  {
    id: 'p8',
    title: 'Privacy-Preserving Federated Learning for Educational Data Mining',
    authors: ['Zhao, X.', 'Chen, L.'],
    venue: 'EDM',
    year: 2024,
    abstract: '本文提出了一种隐私保护的联邦学习框架，用于教育数据挖掘任务。该方法在保护学生隐私的同时，保证了模型的预测精度。',
    tags: ['联邦学习', '隐私保护', '教育数据挖掘'],
    citations: 28,
    readStatus: 'unread',
    addedAt: daysAgo(5),
    hasEvidence: false,
  },
  {
    id: 'p9',
    title: 'Attention Is All You Need for Graph Representation Learning',
    authors: ['Vaswani, A.', 'et al.'],
    venue: 'ICLR',
    year: 2022,
    abstract: '本文将 Transformer 架构引入图表示学习领域，提出了 Graph Transformer 模型，在多个图级和节点级预测任务上取得了 SOTA 结果。',
    tags: ['Transformer', '图表示学习', '注意力'],
    citations: 892,
    readStatus: 'read',
    addedAt: daysAgo(90),
    hasEvidence: true,
  },
  {
    id: 'p10',
    title: 'Dynamic Graph Neural Networks: A Survey',
    authors: ['Trivedi, R.', 'Zitnik, M.'],
    venue: 'arXiv preprint',
    year: 2024,
    abstract: '本文综述了动态图神经网络的最新进展，涵盖离散时间和连续时间两种建模范式，并讨论了其在推荐系统、交通预测和社交网络中的应用。',
    tags: ['动态GNN', '时序图', '综述'],
    citations: 76,
    readStatus: 'unread',
    addedAt: daysAgo(3),
    hasEvidence: false,
  },
  {
    id: 'p11',
    title: 'Learning to Optimize: A Primer on Meta-Learning for Optimization',
    authors: ['Andrychowicz, M.', 'et al.'],
    venue: 'NeurIPS',
    year: 2022,
    abstract: '本文探索了使用元学习自动学习优化算法的方法，展示了学习到的优化器在多种任务上的泛化能力。',
    tags: ['元学习', '优化算法', '深度学习'],
    citations: 421,
    readStatus: 'read',
    addedAt: daysAgo(70),
    hasEvidence: true,
  },
  {
    id: 'p12',
    title: 'A Formal Proof of the Max-Flow Min-Cut Theorem in Lean 4',
    authors: ['de Moura, L.', 'Kumar, R.'],
    venue: 'ITP',
    year: 2023,
    abstract: '本文介绍了在 Lean 4 证明助手中形式化证明最大流最小割定理的工作，展示了现代证明助手在复杂算法验证中的应用。',
    tags: ['形式化验证', 'Lean4', '最大流', '定理证明'],
    citations: 45,
    readStatus: 'unread',
    addedAt: daysAgo(7),
    hasEvidence: false,
  },
  {
    id: 'p13',
    title: 'Deep Knowledge Tracing with Graph-based Skill Relations',
    authors: ['Chen, L.', 'Liu, Y.'],
    venue: 'AAAI',
    year: 2024,
    abstract: '本文将知识点之间的图结构关系引入深度知识追踪模型，通过图卷积网络建模技能依赖，显著提升了预测准确率。',
    tags: ['知识追踪', 'GNN', '技能图'],
    citations: 67,
    readStatus: 'reading',
    addedAt: daysAgo(12),
    hasEvidence: true,
  },
  {
    id: 'p14',
    title: 'Multi-Modal Learning Analytics: Fusing Behavioral and Cognitive Data',
    authors: ['Zhou, X.', 'Sun, J.'],
    venue: 'LAK',
    year: 2024,
    abstract: '本文探索了多模态学习分析的方法，融合学习行为数据与认知评估数据，构建更全面的学习者模型。',
    tags: ['多模态', '学习分析', '数据融合'],
    citations: 23,
    readStatus: 'unread',
    addedAt: daysAgo(4),
    hasEvidence: false,
  },
  {
    id: 'p15',
    title: 'Reinforcement Learning-Based Adaptive Instructional Systems: A Review',
    authors: ['Peng, S.', 'Huang, Z.'],
    venue: 'IEEE Transactions on Learning Technologies',
    year: 2023,
    abstract: '本文综述了强化学习在自适应教学系统中的应用，涵盖策略学习、奖励设计和评估方法等方面。',
    tags: ['强化学习', '自适应教学', '综述'],
    citations: 134,
    readStatus: 'read',
    addedAt: daysAgo(55),
    hasEvidence: true,
  },
  {
    id: 'p16',
    title: 'Graph Neural Networks for Urban Computing: Challenges and Opportunities',
    authors: ['Li, Y.', 'Zhang, W.'],
    venue: 'ACM Transactions on Intelligent Systems and Technology',
    year: 2024,
    abstract: '本文系统综述了图神经网络在城市计算中的应用，包括交通预测、空气质量估计和人群流动分析等场景。',
    tags: ['GNN', '城市计算', '交通'],
    citations: 56,
    readStatus: 'unread',
    addedAt: daysAgo(1),
    hasEvidence: false,
  },
  {
    id: 'p17',
    title: 'Federated Graph Neural Networks for Cross-Institutional Educational Research',
    authors: ['Wang, H.', 'Chen, Y.'],
    venue: 'AIED',
    year: 2024,
    abstract: '本文提出了一种联邦图神经网络框架，支持跨机构的教育数据协作研究，在保护数据隐私的前提下实现了模型的协同训练。',
    tags: ['联邦学习', 'GNN', '教育研究', '隐私'],
    citations: 12,
    readStatus: 'unread',
    addedAt: daysAgo(2),
    hasEvidence: false,
  },
]

const COLLECTIONS: LiteratureCollection[] = [
  { id: 'col-1', name: 'GNN 与路径规划', count: 8, type: 'manual' },
  { id: 'col-2', name: '自适应学习', count: 6, type: 'manual' },
  { id: 'col-3', name: '教育数据融合', count: 5, type: 'smart' },
  { id: 'col-4', name: '近期高引用论文', count: 10, type: 'smart' },
  { id: 'col-5', name: '待读文献', count: 7, type: 'smart' },
]

// ===== 数学验证 =====
const VERIFY_CAPABILITIES: VerifyCapability[] = [
  {
    name: '数值验证',
    key: 'numerical',
    status: 'passed',
    description: '通过随机抽样和边界值代入验证等式正确性',
    detail: '在定义域内随机抽取 1000 组样本，全部通过验证；边界值测试 50 组，全部通过。',
  },
  {
    name: '符号推导',
    key: 'symbolic',
    status: 'passed',
    description: '使用符号计算引擎逐步验证推导过程',
    detail: '共验证 12 个推导步骤，全部步骤符号等价性成立。',
  },
  {
    name: '量纲检查',
    key: 'dimensional',
    status: 'passed',
    description: '验证等式两边物理量纲的一致性',
    detail: '左边量纲：[L/T]，右边量纲：[L/T]，量纲一致。',
  },
  {
    name: '不等式边界',
    key: 'inequality',
    status: 'warning',
    description: '验证不等式在给定边界条件下的成立性',
    detail: '在约束条件 x > 0 下成立；当 x → 0+ 时，两边差值趋近于 0，需注意极限情况。',
  },
  {
    name: '反例搜索',
    key: 'counterexample',
    status: 'passed',
    description: '在参数空间内搜索潜在反例',
    detail: '搜索范围：x ∈ [-100, 100]，步长 0.01，未发现反例。',
  },
  {
    name: '形式化证明',
    key: 'formal_proof',
    status: 'info',
    description: '建议升级为 Lean4 形式化证明',
    detail: '当前推导可进一步形式化。点击「升级证明」可在 Lean4 中进行完整机器验证。',
  },
]

const VERIFY_HISTORY: VerifyResult[] = [
  {
    id: 'v-1',
    expression: '∫_0^∞ e^(-x²) dx = √π/2',
    status: 'verified',
    capabilities: [
      { ...VERIFY_CAPABILITIES[0], status: 'passed' },
      { ...VERIFY_CAPABILITIES[1], status: 'passed' },
      { ...VERIFY_CAPABILITIES[2], status: 'passed' },
      { ...VERIFY_CAPABILITIES[3], status: 'passed' },
      { ...VERIFY_CAPABILITIES[4], status: 'passed' },
      { ...VERIFY_CAPABILITIES[5], status: 'info' },
    ],
    summary: '高斯积分验证通过，数值、符号、量纲全部一致。建议升级为形式化证明。',
  },
  {
    id: 'v-2',
    expression: 'e^(iπ) + 1 = 0',
    status: 'verified',
    capabilities: [
      { ...VERIFY_CAPABILITIES[0], status: 'passed' },
      { ...VERIFY_CAPABILITIES[1], status: 'passed' },
      { ...VERIFY_CAPABILITIES[2], status: 'passed' },
      { ...VERIFY_CAPABILITIES[3], status: 'passed' },
      { ...VERIFY_CAPABILITIES[4], status: 'passed' },
      { ...VERIFY_CAPABILITIES[5], status: 'info' },
    ],
    summary: '欧拉恒等式验证通过，数值精度达到 1e-15。',
  },
  {
    id: 'v-3',
    expression: 'GNN 注意力权重收敛性证明',
    status: 'partial',
    capabilities: [
      { ...VERIFY_CAPABILITIES[0], status: 'passed' },
      { ...VERIFY_CAPABILITIES[1], status: 'warning' },
      { ...VERIFY_CAPABILITIES[2], status: 'passed' },
      { ...VERIFY_CAPABILITIES[3], status: 'warning' },
      { ...VERIFY_CAPABILITIES[4], status: 'passed' },
      { ...VERIFY_CAPABILITIES[5], status: 'info' },
    ],
    summary: '部分通过：数值验证和反例搜索通过，符号推导中第 3 步存在边界条件缺失，建议补充。',
  },
  {
    id: 'v-4',
    expression: '路径规划下界不等式',
    status: 'failed',
    capabilities: [
      { ...VERIFY_CAPABILITIES[0], status: 'failed' },
      { ...VERIFY_CAPABILITIES[1], status: 'failed' },
      { ...VERIFY_CAPABILITIES[2], status: 'passed' },
      { ...VERIFY_CAPABILITIES[3], status: 'failed' },
      { ...VERIFY_CAPABILITIES[4], status: 'failed' },
      { ...VERIFY_CAPABILITIES[5], status: 'info' },
    ],
    summary: '验证失败：在 n=3 的反例中不等式不成立。建议检查第 2 步推导。',
  },
]

// ===== Lean4 =====
const LEAN_FILES: Record<string, LeanFile[]> = {
  'proj-gnn': [
    {
      id: 'lf-root',
      name: 'gnn_path_planning',
      path: '.',
      type: 'folder',
      children: [
        {
          id: 'lf-1',
          name: 'GraphBasics.lean',
          path: './GraphBasics.lean',
          type: 'file',
        },
        {
          id: 'lf-2',
          name: 'AttentionMechanism.lean',
          path: './AttentionMechanism.lean',
          type: 'file',
        },
        {
          id: 'lf-3',
          name: 'PathCorrectness.lean',
          path: './PathCorrectness.lean',
          type: 'file',
        },
        {
          id: 'lf-4',
          name: 'ConvergenceProof.lean',
          path: './ConvergenceProof.lean',
          type: 'file',
        },
      ],
    },
  ],
}

const LEAN_BUILDS: Record<string, LeanBuildStatus> = {
  'build-1': {
    id: 'build-1',
    status: 'success',
    progress: 100,
    totalFiles: 4,
    processedFiles: 4,
    startTime: hoursAgo(2),
    endTime: hoursAgo(1.5),
    errors: 0,
    warnings: 2,
  },
  'build-2': {
    id: 'build-2',
    status: 'running',
    progress: 65,
    totalFiles: 4,
    processedFiles: 2,
    startTime: hoursAgo(0.2),
    errors: 0,
    warnings: 1,
  },
}

const LEAN_GOALS: Record<string, LeanGoal[]> = {
  'lf-2': [
    {
      target: 'attention_weights_sum_to_one : ∀ (v : V), ∑_{u ∈ N(v)} α(v, u) = 1',
      hypotheses: [
        'α(v, u) = softmax(a^T [W h_v || W h_u])',
        'N(v) 是节点 v 的邻居集合',
        'softmax 在邻居集合上归一化',
      ],
    },
    {
      target: 'attention_non_negative : ∀ (v u : V), α(v, u) ≥ 0',
      hypotheses: [
        'softmax 函数输出非负',
        'α(v, u) 通过 softmax 计算',
      ],
    },
  ],
  'lf-3': [
    {
      target: 'path_correctness : shortest_path G s t = dijkstra G s t',
      hypotheses: [
        'G 是带权有向图，权重非负',
        'shortest_path 是我们算法的输出',
        'dijkstra 是经典 Dijkstra 算法的结果',
      ],
    },
  ],
}

// ===== 论文写作 =====
const WRITING_PROJECTS: WritingProject[] = [
  {
    id: 'wp-1',
    title: 'GNN 路径规划优化研究',
    compileStatus: 'success',
    lastCompiled: hoursAgo(3),
    pageCount: 12,
  },
  {
    id: 'wp-2',
    title: '教育数据跨端协作分析',
    compileStatus: 'compiling',
    lastCompiled: hoursAgo(24),
    pageCount: 15,
  },
  {
    id: 'wp-3',
    title: '自适应学习路径推荐算法',
    compileStatus: 'success',
    lastCompiled: daysAgo(1),
    pageCount: 18,
  },
]

// ===== 论文初审 =====
const REVIEW_SUBMISSIONS: ReviewSubmission[] = [
  {
    id: 'rs-1',
    title: 'GNN 路径规划优化研究',
    authors: ['张明远', '李思涵', '王浩然'],
    submittedAt: daysAgo(5),
    status: 'reviewed',
    scores: { novelty: 3.8, correctness: 4.2, completeness: 3.5, clarity: 4.0 },
    findingsCount: 7,
  },
  {
    id: 'rs-2',
    title: '教育数据跨端协作分析',
    authors: ['张明远', '刘博文', '赵欣怡'],
    submittedAt: daysAgo(2),
    status: 'analyzing',
    scores: { novelty: 0, correctness: 0, completeness: 0, clarity: 0 },
    findingsCount: 0,
  },
  {
    id: 'rs-3',
    title: '自适应学习路径推荐算法',
    authors: ['黄子轩', '李思涵', '林诗涵'],
    submittedAt: daysAgo(10),
    status: 'reviewed',
    scores: { novelty: 4.5, correctness: 4.0, completeness: 4.2, clarity: 3.8 },
    findingsCount: 5,
  },
  {
    id: 'rs-4',
    title: '联邦图神经网络在教育数据中的应用',
    authors: ['王浩然', '陈雨桐'],
    submittedAt: daysAgo(1),
    status: 'pending',
    scores: { novelty: 0, correctness: 0, completeness: 0, clarity: 0 },
    findingsCount: 0,
  },
  {
    id: 'rs-5',
    title: '课程学习策略在 DRL 中的有效性研究',
    authors: ['黄子轩', '林诗涵'],
    submittedAt: daysAgo(7),
    status: 'reviewed',
    scores: { novelty: 3.2, correctness: 4.5, completeness: 3.8, clarity: 4.2 },
    findingsCount: 4,
  },
  {
    id: 'rs-6',
    title: '多模态学习分析的统一框架',
    authors: ['周晓燕', '孙嘉伟'],
    submittedAt: hoursAgo(12),
    status: 'pending',
    scores: { novelty: 0, correctness: 0, completeness: 0, clarity: 0 },
    findingsCount: 0,
  },
]

const REVIEW_FINDINGS: Record<string, ReviewFinding[]> = {
  'rs-1': [
    {
      id: 'f-1',
      category: '创新性',
      severity: 'major',
      description: 'GNN 注意力机制的改进与已有工作（Graph Transformer）的区别阐述不够清晰，建议在 Related Work 部分加强对比分析。',
      location: '第 2 节 Related Work',
    },
    {
      id: 'f-2',
      category: '正确性',
      severity: 'minor',
      description: '定理 3.2 的证明中，第 (3) 步的不等式方向需要再核对。',
      location: '第 3.2 节 定理 3.2 证明',
    },
    {
      id: 'f-3',
      category: '完整性',
      severity: 'critical',
      description: '缺少与动态图路径规划基线方法的对比实验，建议补充 DQN-path 和 A*+GNN 等方法的对比。',
      location: '第 5 节 实验',
    },
    {
      id: 'f-4',
      category: '清晰度',
      severity: 'minor',
      description: '图 4 的坐标轴标注不清晰，建议补充图例说明。',
      location: '图 4',
    },
    {
      id: 'f-5',
      category: '创新性',
      severity: 'info',
      description: '动态边权重策略具有一定新颖性，可考虑在摘要中突出。',
      location: '摘要',
    },
    {
      id: 'f-6',
      category: '正确性',
      severity: 'info',
      description: '消融实验设计合理，变量控制得当。',
      location: '第 5.3 节 消融实验',
    },
    {
      id: 'f-7',
      category: '完整性',
      severity: 'major',
      description: '未讨论模型的时间复杂度和空间复杂度，建议补充分析。',
      location: '第 4 节 方法',
    },
  ],
  'rs-3': [
    {
      id: 'f-8',
      category: '创新性',
      severity: 'minor',
      description: '课程学习策略与知识图谱的结合有一定新意，但核心贡献需要更明确地陈述。',
      location: '第 1 节 引言',
    },
    {
      id: 'f-9',
      category: '正确性',
      severity: 'info',
      description: '实验设计严谨，统计检验方法正确。',
      location: '第 5 节 实验',
    },
    {
      id: 'f-10',
      category: '完整性',
      severity: 'minor',
      description: '建议补充在真实课堂环境中的案例研究。',
      location: '第 6 节 讨论',
    },
    {
      id: 'f-11',
      category: '清晰度',
      severity: 'info',
      description: '论文结构清晰，写作流畅。',
      location: '整体',
    },
    {
      id: 'f-12',
      category: '创新性',
      severity: 'info',
      description: 'DQN + 课程学习 + 知识图谱的组合具有实用价值。',
      location: '第 4 节 方法',
    },
  ],
  'rs-5': [
    {
      id: 'f-13',
      category: '正确性',
      severity: 'critical',
      description: '基线方法选择不够全面，缺少与最新的 SOTA 课程学习方法的对比。',
      location: '第 5 节 实验',
    },
    {
      id: 'f-14',
      category: '创新性',
      severity: 'minor',
      description: '整体创新性中等，建议强调应用场景的独特性。',
      location: '第 1 节 引言',
    },
    {
      id: 'f-15',
      category: '完整性',
      severity: 'info',
      description: '论文结构完整，理论分析和实验验证都比较充分。',
      location: '整体',
    },
    {
      id: 'f-16',
      category: '清晰度',
      severity: 'minor',
      description: '算法伪代码中的变量命名建议统一。',
      location: '算法 1',
    },
  ],
}

// ===== 教育研究 =====
const EDUCATION_ANALYSES: EducationAnalysis[] = [
  {
    id: 'ea-1',
    name: '跨端学习行为与学业表现关联分析',
    status: 'completed',
    step: 5,
    dataset: '2024春季学期_多平台融合数据',
    metrics: ['学习时长', '访问频率', '作业完成率', '成绩分布'],
    findings: [
      '跨端活跃用户的平均成绩比单端用户高 12.3%',
      '移动端学习时长与作业完成率呈显著正相关 (r=0.68)',
      '周末学习模式对成绩预测的贡献度高于工作日',
    ],
  },
  {
    id: 'ea-2',
    name: '自适应推荐效果 A/B 测试分析',
    status: 'running',
    step: 3,
    dataset: '实验班_对照班_学习路径数据',
    metrics: ['学习效率', '知识掌握度', '学习投入度', '留存率'],
    findings: [
      '实验班知识掌握度提升速度比对照班快 18%',
    ],
  },
  {
    id: 'ea-3',
    name: '学习路径多样性与成绩关系研究',
    status: 'configuring',
    step: 1,
    metrics: ['路径熵', '知识点覆盖度', '回溯率', '成绩'],
  },
]

// ===== 运行中心 =====
const RUNS: ResearchRun[] = [
  {
    id: 'run-1',
    type: 'verify',
    title: 'GNN 注意力权重收敛性验证',
    status: 'running',
    progress: 62,
    mode: 'FULL',
    duration: 185,
    startedAt: hoursAgo(0.1),
    projectId: 'proj-gnn',
    projectName: 'GNN 路径规划优化研究',
  },
  {
    id: 'run-2',
    type: 'lean_build',
    title: 'AttentionMechanism.lean 构建',
    status: 'success',
    progress: 100,
    mode: 'LOCAL_ENGINE',
    duration: 320,
    startedAt: hoursAgo(2),
    projectId: 'proj-gnn',
    projectName: 'GNN 路径规划优化研究',
  },
  {
    id: 'run-3',
    type: 'compile',
    title: '论文编译：教育数据跨端协作分析',
    status: 'running',
    progress: 45,
    mode: 'FULL',
    duration: 45,
    startedAt: hoursAgo(0.05),
    projectId: 'proj-edu',
    projectName: '教育数据跨端协作分析',
  },
  {
    id: 'run-4',
    type: 'analysis',
    title: '自适应推荐效果 A/B 测试',
    status: 'running',
    progress: 78,
    mode: 'FULL',
    duration: 1200,
    startedAt: hoursAgo(1.5),
    projectId: 'proj-adaptive',
    projectName: '自适应学习路径推荐算法',
  },
  {
    id: 'run-5',
    type: 'review',
    title: '论文初审：联邦图神经网络',
    status: 'queued',
    progress: 0,
    mode: 'FULL',
    startedAt: hoursAgo(0.02),
    projectId: 'proj-edu',
    projectName: '教育数据跨端协作分析',
  },
  {
    id: 'run-6',
    type: 'verify',
    title: '路径规划下界不等式验证',
    status: 'failed',
    progress: 100,
    mode: 'BROWSER_LOCAL',
    duration: 25,
    startedAt: hoursAgo(5),
    projectId: 'proj-gnn',
    projectName: 'GNN 路径规划优化研究',
  },
  {
    id: 'run-7',
    type: 'lean_build',
    title: '完整项目构建',
    status: 'success',
    progress: 100,
    mode: 'LOCAL_ENGINE',
    duration: 540,
    startedAt: daysAgo(1),
    projectId: 'proj-gnn',
    projectName: 'GNN 路径规划优化研究',
  },
  {
    id: 'run-8',
    type: 'compile',
    title: '论文编译：GNN 路径规划优化研究',
    status: 'success',
    progress: 100,
    mode: 'FULL',
    duration: 68,
    startedAt: hoursAgo(3),
    projectId: 'proj-gnn',
    projectName: 'GNN 路径规划优化研究',
  },
  {
    id: 'run-9',
    type: 'analysis',
    title: '跨端学习行为关联分析',
    status: 'success',
    progress: 100,
    mode: 'FULL',
    duration: 2400,
    startedAt: daysAgo(3),
    projectId: 'proj-edu',
    projectName: '教育数据跨端协作分析',
  },
  {
    id: 'run-10',
    type: 'review',
    title: '论文初审：GNN 路径规划优化研究',
    status: 'success',
    progress: 100,
    mode: 'FULL',
    duration: 180,
    startedAt: daysAgo(5),
    projectId: 'proj-gnn',
    projectName: 'GNN 路径规划优化研究',
  },
]

// ===== 证据账本 =====
const EVIDENCE: EvidenceItem[] = [
  {
    id: 'e-1',
    type: 'derivation',
    title: 'GNN 注意力权重归一化推导',
    source: '数学验证引擎',
    status: 'verified',
    createdAt: daysAgo(5),
    projectId: 'proj-gnn',
  },
  {
    id: 'e-2',
    type: 'theorem',
    title: '路径规划正确性定理',
    source: 'Lean4 形式化证明',
    status: 'verified',
    createdAt: daysAgo(3),
    projectId: 'proj-gnn',
  },
  {
    id: 'e-3',
    type: 'numerical',
    title: '收敛速度数值实验',
    source: '数值验证引擎',
    status: 'verified',
    createdAt: daysAgo(7),
    projectId: 'proj-gnn',
  },
  {
    id: 'e-4',
    type: 'literature',
    title: 'Graph Attention Networks (GAT) 原文',
    source: 'Velickovic et al., 2018',
    status: 'verified',
    createdAt: daysAgo(30),
    projectId: 'proj-gnn',
  },
  {
    id: 'e-5',
    type: 'experiment',
    title: 'A/B 测试：实验班 vs 对照班',
    source: '教育研究模块',
    status: 'pending',
    createdAt: hoursAgo(2),
    projectId: 'proj-adaptive',
  },
  {
    id: 'e-6',
    type: 'derivation',
    title: '知识图谱路径搜索最优性证明',
    source: '数学验证引擎',
    status: 'verified',
    createdAt: daysAgo(15),
    projectId: 'proj-adaptive',
  },
  {
    id: 'e-7',
    type: 'theorem',
    title: 'DQN 收敛性定理',
    source: 'Lean4 形式化证明',
    status: 'pending',
    createdAt: daysAgo(1),
    projectId: 'proj-adaptive',
  },
  {
    id: 'e-8',
    type: 'literature',
    title: 'Deep Knowledge Tracing',
    source: 'Piech et al., 2015',
    status: 'verified',
    createdAt: daysAgo(45),
    projectId: 'proj-adaptive',
  },
  {
    id: 'e-9',
    type: 'numerical',
    title: '跨端数据融合准确率',
    source: '教育研究模块',
    status: 'verified',
    createdAt: daysAgo(10),
    projectId: 'proj-edu',
  },
  {
    id: 'e-10',
    type: 'experiment',
    title: '多源数据对齐实验',
    source: '教育研究模块',
    status: 'rejected',
    createdAt: daysAgo(20),
    projectId: 'proj-edu',
  },
]

// ===== 仪表盘 =====
const ACTIVITY_ITEMS: ActivityItem[] = [
  {
    id: 'a-1',
    type: 'verify',
    title: '数学验证完成',
    description: 'GNN 注意力权重收敛性验证完成，状态：部分通过',
    time: hoursAgo(0.5),
    icon: 'check',
  },
  {
    id: 'a-2',
    type: 'literature',
    title: '新增文献',
    description: '添加了 3 篇新文献到「GNN 与路径规划」文集',
    time: hoursAgo(2),
    icon: 'book',
  },
  {
    id: 'a-3',
    type: 'lean_build',
    title: 'Lean 构建完成',
    description: 'AttentionMechanism.lean 构建成功，0 错误 1 警告',
    time: hoursAgo(3),
    icon: 'code',
  },
  {
    id: 'a-4',
    type: 'analysis',
    title: '分析任务启动',
    description: '自适应推荐效果 A/B 测试分析已启动',
    time: hoursAgo(5),
    icon: 'chart',
  },
  {
    id: 'a-5',
    type: 'review',
    title: '论文初审完成',
    description: '「自适应学习路径推荐算法」初审完成，发现 5 个问题',
    time: daysAgo(1),
    icon: 'review',
  },
  {
    id: 'a-6',
    type: 'evidence',
    title: '证据验证通过',
    description: '路径规划正确性定理通过 Lean4 形式化验证',
    time: daysAgo(2),
    icon: 'shield',
  },
]

const DASHBOARD: DashboardData = {
  projectsCount: 3,
  literatureCount: 17,
  verifiedEvidence: 7,
  weeklyRuns: 12,
  successRate: 75,
  focusTask: {
    title: 'GNN 注意力权重收敛性验证',
    description: '正在进行符号推导与不等式边界验证，预计还需 2 分钟',
    progress: 62,
    targetView: '/research/verify',
  },
  recentProjects: PROJECTS,
  recentActivity: ACTIVITY_ITEMS,
}

// ===== Mock 导出对象 =====
export const researchMock = {
  // 仪表盘
  getDashboard: (): DashboardData => DASHBOARD,

  // 项目管理
  getProjects: (params: { status?: string; page?: number; pageSize?: number } = {}): ResearchProject[] => {
    let result = [...PROJECTS]
    if (params.status) {
      result = result.filter(p => p.status === params.status)
    }
    return result
  },

  getProjectDetail: (id: string): ResearchProject | undefined => {
    return PROJECTS.find(p => p.id === id)
  },

  getProjectMembers: (id: string): ProjectMember[] => {
    return PROJECT_MEMBERS[id] || []
  },

  getProjectTasks: (id: string): ProjectTask[] => {
    return PROJECT_TASKS[id] || []
  },

  getProjectEvidence: (id: string): EvidenceItem[] => {
    return EVIDENCE.filter(e => e.projectId === id)
  },

  getProjectActivity: (id: string): ActivityItem[] => {
    return ACTIVITY_ITEMS.slice(0, 5)
  },

  // 文献管理
  getPapers: (params: { page?: number; pageSize?: number; q?: string; tag?: string; readStatus?: string } = {}): { items: Paper[]; total: number } => {
    let result = [...PAPERS]
    if (params.q) {
      const q = params.q.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.abstract.toLowerCase().includes(q) ||
        p.authors.some(a => a.toLowerCase().includes(q))
      )
    }
    if (params.tag) {
      result = result.filter(p => p.tags.includes(params.tag!))
    }
    if (params.readStatus) {
      result = result.filter(p => p.readStatus === params.readStatus)
    }
    const total = result.length
    const page = params.page || 1
    const pageSize = params.pageSize || 10
    const start = (page - 1) * pageSize
    const items = result.slice(start, start + pageSize)
    return { items, total }
  },

  getPaperDetail: (id: string): Paper | undefined => {
    return PAPERS.find(p => p.id === id)
  },

  getCollections: (): LiteratureCollection[] => COLLECTIONS,

  // 数学验证
  verifyDerivation: (payload: { expression: string }): VerifyResult => {
    const expr = payload.expression || '∫_0^∞ e^(-x²) dx = √π/2'
    return {
      id: `v-${Date.now()}`,
      expression: expr,
      status: 'verified',
      capabilities: VERIFY_CAPABILITIES,
      summary: '验证通过：数值、符号、量纲检查全部一致。建议升级为 Lean4 形式化证明以获得更高可信度。',
    }
  },

  getVerifyHistory: (): VerifyResult[] => VERIFY_HISTORY,

  // Lean4
  getLeanFiles: (projectId: string): LeanFile[] => {
    return LEAN_FILES[projectId] || LEAN_FILES['proj-gnn'] || []
  },

  getLeanFileContent: (fileId: string): string => {
    return `import Mathlib

-- ${fileId}
-- 本文件由研究助手自动生成框架

theorem attention_weights_sum_to_one {V : Type} (N : V → Finset V)
  (α : V → V → ℝ) (h_softmax : ∀ v, ∑ u in N v, α v u = 1) :
  ∀ v, ∑ u in N v, α v u = 1 := by
  intro v
  exact h_softmax v

#check attention_weights_sum_to_one
`
  },

  startLeanBuild: (projectId: string): LeanBuildStatus => {
    return {
      id: `build-${Date.now()}`,
      status: 'running',
      progress: 0,
      totalFiles: 4,
      processedFiles: 0,
      startTime: iso(),
      errors: 0,
      warnings: 0,
    }
  },

  getLeanBuildStatus: (buildId: string): LeanBuildStatus => {
    return LEAN_BUILDS[buildId] || LEAN_BUILDS['build-1']
  },

  getLeanGoals: (fileId: string): LeanGoal[] => {
    return LEAN_GOALS[fileId] || [
      {
        target: 'theorem_goal : P → Q',
        hypotheses: ['h1 : P', 'h2 : P → Q'],
      },
    ]
  },

  // 论文写作
  getWritingProjects: (): WritingProject[] => WRITING_PROJECTS,

  // 论文初审
  getReviewSubmissions: (): ReviewSubmission[] => REVIEW_SUBMISSIONS,

  getReviewFindings: (submissionId: string): ReviewFinding[] => {
    return REVIEW_FINDINGS[submissionId] || []
  },

  // 教育研究
  getEducationAnalyses: (): EducationAnalysis[] => EDUCATION_ANALYSES,

  // 运行中心
  getRuns: (params: { type?: string; status?: string; page?: number; pageSize?: number } = {}): { items: ResearchRun[]; total: number } => {
    let result = [...RUNS]
    if (params.type) {
      result = result.filter(r => r.type === params.type)
    }
    if (params.status) {
      result = result.filter(r => r.status === params.status)
    }
    const total = result.length
    const page = params.page || 1
    const pageSize = params.pageSize || 10
    const start = (page - 1) * pageSize
    const items = result.slice(start, start + pageSize)
    return { items, total }
  },

  getRunDetail: (id: string): ResearchRun | undefined => {
    return RUNS.find(r => r.id === id)
  },

  // 证据账本
  getEvidence: (params: { type?: string; status?: string; projectId?: string; page?: number; pageSize?: number } = {}): EvidenceItem[] => {
    let result = [...EVIDENCE]
    if (params.type) {
      result = result.filter(e => e.type === params.type)
    }
    if (params.status) {
      result = result.filter(e => e.status === params.status)
    }
    if (params.projectId) {
      result = result.filter(e => e.projectId === params.projectId)
    }
    return result
  },
}
