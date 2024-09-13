//No need to change code other than the last four methods
import { getClient, getDB } from '../../config/mongodb.js';

const collectionName = 'students';

class studentRepository {


    async addStudent(studentData) {
        const db = getDB();
        await db.collection(collectionName).insertOne(studentData);
    }

    async getAllStudents() {
        const db = getDB();
        const students = await db.collection(collectionName).find({}).toArray();
        return students;
    }


    //You need to implement methods below:

    async createIndexes() {
        const db = getDB();
        await db.collection(collectionName).createIndex({ name: 1 });
        await db.collection(collectionName).createIndex({ age: 1, grade: -1 });
    }

    async getStudentsWithAverageScore() {
        const db = getDB();
        // const students = await db.collection(collectionName).aggregate([
        //     { $group: { _id: null, averageScore: { $avg: "$assignments.score" } } },
        //     { $project: { name:1, averageScore: 1 } }
        // ]).toArray();
        // return students;
        const aggregationPipeline=[{$project: {_id:0,name:1, averageScore:{ $avg: "$assignments.score" } }}];
        const students = await db.collection(collectionName).aggregate(aggregationPipeline).toArray();
        return students;
    }

    async getQualifiedStudentsCount() {
        const db = getDB(); // Get the database connection
        const aggregationPipeline = await db.collection(collectionName).find({
            $and: [
                { age: { $gt: 9 } }, // Condition 1: Age must be greater than 9
                { grade: { $lte: 'B' }}, // Condition 2: Grade must be less than or equal to 'B'
                {
                    assignments: {
                        $elemMatch: {
                            title: { $eq: 'math' }, // Condition 3: Assignment title must be 'math'
                            score: { $gte: 60 } // Condition 4: Assignment score must be 60 or higher
                        }
                    }
                }
            ]
        }).count(); // Use count() to directly get the number of documents matching the query
        return aggregationPipeline; // Return the count
    }
    

    async updateStudentGrade(studentId,extraCreditPoints) {
        const db = getDB();
        const client=getClient();
        const session=client.startSession();
        try{
            session.startTransaction();
            const student=await db.collection(collectionName).findOne({_id:new ObjectId(studentId)},{session});
            if(!student) {
                throw new Error('Student not found');
            }
            const updateAssingment=student.assingment.map((assignment) => {
                return {...assignment,score:assignment.score+extraCreditPoints}});
            const totalScore=updateAssingment.reduce((sum, assignment) => {sum+assignment.score,0});
            const averageScore=totalScore/updateAssingment.length;
            let updatedGrade="A";
            if(averageScore>=90){
                updatedGrade="A";
            }
            else if(averageScore>=80){
                updatedGrade="B";
            }
            else if(averageScore>=70){
                updatedGrade="C";
            }
            else if(averageScore>=60){
                updatedGrade="D";
            }
            else{
                updatedGrade="F";
            }
            await db.collection(collectionName).updateOne({ _id: new ObjectId(studentId) }, { $set: { assignment:updateAssingment,grade: updatedGrade } }, { session });
            await session.commitTransaction();
            session.endSession();   
        }catch(error){
            await session.abortTransaction();
            session.endSession(); 
            throw error;
        }
        finally{
            client.close();  // Close the client connection when done
        }
        // await db.collection(collectionName).updateOne({ _id: studentId }, { $inc: { extraCreditPoints: extraCreditPoints } }); // Use $inc to increment the extraCreditPoints by the given value
    }

};

export default studentRepository;
