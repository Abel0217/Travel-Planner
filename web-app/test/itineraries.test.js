const request = require('supertest');
const app = require('../src/app'); // Adjust this path to where your Express app is exported
const expect = require('chai').expect;

describe('GET /itineraries', function() {
  it('should return all itineraries', function(done) {
    request(app)
      .get('/itineraries')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.be.an('array');
        done();
      });
  });
});

describe('POST /itineraries', function() {
  it('should create a new itinerary', function(done) {
    request(app)
      .post('/itineraries')
      .send({ title: "Test Trip", description: "Testing", start_date: "2024-01-01", end_date: "2024-01-05", owner_id: 1 })
      .expect(201)
      .end(function(err, res) {
        if (err) return done(err);
        expect(res.body).to.have.property('itinerary_id');
        expect(res.body.title).to.equal("Test Trip");
        done();
      });
  });
});
