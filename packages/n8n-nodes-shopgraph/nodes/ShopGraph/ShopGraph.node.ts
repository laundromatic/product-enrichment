import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class ShopGraph implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ShopGraph',
		name: 'shopGraph',
		icon: 'file:shopgraph.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Extract structured product data with confidence scores',
		defaults: {
			name: 'ShopGraph',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'shopGraphApi',
				required: false,
			},
		],
		properties: [
			// ------ Operation selector ------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Enrich Product',
						value: 'enrich_product',
						description: 'Extract full structured product data from a URL',
						action: 'Enrich product',
					},
					{
						name: 'Enrich Basic',
						value: 'enrich_basic',
						description: 'Extract basic product data (free tier, no API key required)',
						action: 'Enrich basic',
					},
					{
						name: 'Enrich HTML',
						value: 'enrich_html',
						description: 'Extract product data from raw HTML',
						action: 'Enrich HTML',
					},
					{
						name: 'Score Product',
						value: 'score_product',
						description: 'Get product data quality scores for a URL',
						action: 'Score product',
					},
				],
				default: 'enrich_product',
			},

			// ------ URL field (all operations except enrich_html use it as sole required input) ------
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://example.com/product/blue-widget',
				description: 'Product page URL to extract data from',
				displayOptions: {
					show: {
						operation: ['enrich_product', 'enrich_basic', 'score_product'],
					},
				},
			},

			// ------ Enrich HTML specific fields ------
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				typeOptions: {
					rows: 6,
				},
				required: true,
				default: '',
				placeholder: '<html>...</html>',
				description: 'Raw HTML of the product page',
				displayOptions: {
					show: {
						operation: ['enrich_html'],
					},
				},
			},
			{
				displayName: 'URL',
				name: 'urlContext',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://example.com/product/blue-widget',
				description: 'Original URL of the page (used for context)',
				displayOptions: {
					show: {
						operation: ['enrich_html'],
					},
				},
			},

			// ------ Shared options for enrich operations ------
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['enrich_product', 'enrich_basic', 'enrich_html'],
					},
				},
				options: [
					{
						displayName: 'Strict Confidence Threshold',
						name: 'strict_confidence_threshold',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
						default: 0.5,
						description:
							'Minimum confidence score (0-1) for fields to be included in the response',
					},
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						options: [
							{
								name: 'Default',
								value: 'default',
							},
							{
								name: 'UCP',
								value: 'ucp',
							},
						],
						default: 'default',
						description: 'Response format',
					},
					{
						displayName: 'Include Score',
						name: 'include_score',
						type: 'boolean',
						default: false,
						description: 'Whether to include confidence scores for each extracted field',
					},
				],
			},

			// ------ Options for score operation ------
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['score_product'],
					},
				},
				options: [
					{
						displayName: 'Strict Confidence Threshold',
						name: 'strict_confidence_threshold',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 1,
							numberPrecision: 2,
						},
						default: 0.5,
						description:
							'Minimum confidence score (0-1) for fields to be included in the response',
					},
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						options: [
							{
								name: 'Default',
								value: 'default',
							},
							{
								name: 'UCP',
								value: 'ucp',
							},
						],
						default: 'default',
						description: 'Response format',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const options = this.getNodeParameter('options', i, {}) as {
					strict_confidence_threshold?: number;
					format?: string;
					include_score?: boolean;
				};

				let endpoint: string;
				const body: Record<string, unknown> = {};

				switch (operation) {
					case 'enrich_product': {
						endpoint = '/api/enrich';
						body.url = this.getNodeParameter('url', i) as string;
						break;
					}
					case 'enrich_basic': {
						endpoint = '/api/enrich/basic';
						body.url = this.getNodeParameter('url', i) as string;
						break;
					}
					case 'enrich_html': {
						endpoint = '/api/enrich/html';
						body.html = this.getNodeParameter('html', i) as string;
						body.url = this.getNodeParameter('urlContext', i) as string;
						break;
					}
					case 'score_product': {
						endpoint = '/api/score';
						body.url = this.getNodeParameter('url', i) as string;
						break;
					}
					default:
						throw new NodeOperationError(
							this.getNode(),
							`Unknown operation: ${operation}`,
							{ itemIndex: i },
						);
				}

				// Apply shared options to request body
				if (options.strict_confidence_threshold !== undefined) {
					body.strict_confidence_threshold = options.strict_confidence_threshold;
				}
				if (options.format && options.format !== 'default') {
					body.format = options.format;
				}
				if (options.include_score !== undefined) {
					body.include_score = options.include_score;
				}

				// Determine whether to use authenticated or unauthenticated request
				let credentials;
				try {
					credentials = await this.getCredentials('shopGraphApi');
				} catch {
					// No credentials configured — fine for free-tier operations
					credentials = null;
				}

				const requestOptions = {
					method: 'POST' as const,
					url: `https://shopgraph.dev${endpoint}`,
					body,
					json: true,
					headers: {} as Record<string, string>,
				};

				let responseData: unknown;

				if (credentials?.apiKey) {
					responseData = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'shopGraphApi',
						requestOptions,
					);
				} else {
					responseData = await this.helpers.httpRequest(requestOptions);
				}

				returnData.push({
					json: responseData as IDataObject,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
