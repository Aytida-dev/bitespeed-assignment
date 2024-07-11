import {
  QueryError,
  QueryResult,
  ResultSetHeader,
} from "mysql2";
import sql from "./db";
import { Customer } from "./types";

function CustomerModel(this: Customer, data: Customer) {
  this.phoneNumber = data.phoneNumber;
  this.email = data.email;
  this.linkedId = data.linkedId;
  this.linkPrecedence = data.linkPrecedence;
  this.createdAt = data.createdAt;
  this.updatedAt = data.updatedAt;
  this.deletedAt = data.deletedAt;
}

CustomerModel.getSpecificCustomer = (email?: String, phoneNumber?: String): Promise<Customer[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        *
      FROM
        customer
      WHERE
        email = ? OR phoneNumber = ?
    `;

    sql.query(
      query,
      [email, phoneNumber],
      (err: QueryError, res: QueryResult) => {
        if (err) {
          reject(err);
          console.log(err);
          return;
        }
        resolve(res as Customer[]);
      }
    );
  });
};

CustomerModel.getAllCustomer = (customer: Customer): Promise<Customer[]> => {
  return new Promise((resolve, reject) => {
    let requiredId: Number
    if (customer.linkPrecedence === "secondary") {
      requiredId = customer.linkedId
    }
    else {
      requiredId = customer.id
    }
    const query = `
      SELECT * FROM customer 
      WHERE id = ? OR linkedId = ?
      ORDER BY linkPrecedence
    `

    sql.query(query, [requiredId, requiredId], (err: QueryError, res: QueryResult) => {
      if (err) {
        reject(err);
        console.log(err);
        return;
      }

      resolve(res as Customer[])
    })
  })
}

CustomerModel.create = (customer: Customer): Promise<number> => {
  return new Promise((resolve, reject) => {
    const query = `
    INSERT INTO 
      customer
    SET ?
    `;
    sql.query(query, [customer], (err: QueryError, res: ResultSetHeader) => {
      if (err) {
        reject(err);
        console.log(err);
        return;
      }

      resolve(res.insertId);
    });
  });
};

CustomerModel.updateLinkedId = (id: number | undefined, linkedId: number, phone?: string, email?: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const updatedAt = new Date();

    let query = `
      UPDATE 
        customer
      SET linkedId = ?, updatedAt = ?
    `;

    const values: (number | string | Date | undefined)[] = [
      linkedId,
      updatedAt,
    ];

    if (id !== undefined) {
      query += ` WHERE id = ?`;
      values.push(id);
    } else if (phone !== undefined && email !== undefined) {
      query += ` WHERE phone = ? AND email = ?`;
      values.push(phone, email);
    } else {
      reject(
        new Error("Either 'id' or both 'phone' and 'email' must be provided.")
      );
      return;
    }

    sql.query(query, values, (err: QueryError, res: ResultSetHeader) => {
      if (err) {
        reject(err);
        console.log(err);
        return;
      }

      resolve("updated");
    });
  });
};

CustomerModel.getPrimary = (linkedId: Number): Promise<Customer> => {
  return new Promise((resolve, reject) => {
    const query = `
    SELECT * FROM customer WHERE id = ?
    `
    sql.query(query, [linkedId], (err: QueryError, res: any) => {
      if (err) {
        reject(err)
        console.log(err);
        return
      }
      if (!res.length) {
        reject("no customer found")
      }

      resolve(res[0])
    })
  })
}

CustomerModel.joinPrimary = (primary1: Customer, primary2: Customer): Promise<String> => {
  return new Promise((resolve, reject) => {
    const updatedAt = new Date()

    const query = `
    UPDATE customer
    SET linkedId = ? , linkPrecedence = ? , updatedAt = ?
    WHERE linkedId = ? OR id = ?
    `

    sql.query(query, [primary1.id, "secondary", updatedAt, primary2.id, primary2.id], (err: QueryError, res: QueryResult) => {
      if (err) {
        reject(err)
        console.log(err);
        return
      }

      resolve("updated")
    })
  })
}

export default CustomerModel;
