const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Finny API",
      version: "1.0.0",
      description: `API documentation for Finny backend

**Key Features:**
- Multi-broker portfolio tracking
- High-precision financial arithmetic (integer value/scale storage)
- Real-time portfolio analytics (MWRR, CAGR)
- Asset allocation & rebalancing recommendations
- Automated price updates from multiple sources
- Email notifications with portfolio summaries

**Data Precision:**
All financial values use decimal notation in the API but are stored internally as integer value/scale pairs:
- Quantity: 8 decimal places
- Price: 6 decimal places  
- Fees: 4 decimal places
- Amounts: 4 decimal places`,
    },
    servers: [
      {
        url: "/api/v1",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        adminAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Admin-only endpoint. Pass the same JWT Bearer token as bearerAuth. " +
            "The server returns 403 if the authenticated user does not have role === 'admin'.",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js", "./models/*.js"], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = (app) => {
  app.use("/api/v1/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
